import zlib from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Writable, Transform } from "node:stream";
import Queue from "promise-queue";
import { setTimeout } from "node:timers/promises";
import tryFetch from "./try-fetch";

type TransformCallback = (error?: Error | null, data?: any) => void;

export class FullLineStream extends Transform {
  private lastLineData = "";

  constructor() {
    super({
      objectMode: true,
    });
  }

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ) {
    const str = this.lastLineData + chunk.toString(encoding);
    const lines = str
      .split("\n")
      .map((l) => l.replaceAll("\r", ""))
      .filter((l) => !!l);

    if (!str.endsWith("\n")) {
      this.lastLineData = lines.pop() ?? "";
    } else {
      this.lastLineData = "";
    }
    callback(null, lines);
  }

  _final(callback: (error?: Error | null) => void) {
    if (this.lastLineData) {
      this.push([this.lastLineData.replaceAll("\r", "")]);
    }
    callback();
  }
}

const baseDomainRegex = /^(https?:\/\/[\w.]+)\/?.*$/;

const fetchGzipTextFile = async (
  url: string,
  lines: (lines: string[]) => void | Promise<void>,
) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch the Common Crawl dataset");
  }

  if (!response.body) {
    throw new Error("Common Crawl dataset is not readable");
  }

  await pipeline(
    response.body,
    zlib.createUnzip(),
    new FullLineStream(),
    new Writable({
      objectMode: true,
      autoDestroy: true,
      async write(chunk, encoding, callback) {
        await lines(chunk);
        callback();
      },
    }),
  );
};

const listFiles = async (dataset: string) => {
  const result: string[] = [];

  await fetchGzipTextFile(
    `https://data.commoncrawl.org/crawl-data/${dataset}/wet.paths.gz`,
    (paths) => {
      result.push(...paths);
    },
  );

  return result;
};

type DomainsHandler = (domains: string[]) => void | Promise<void>;

const processStream = async (path: string, onDomain: DomainsHandler) => {
  const url = `https://data.commoncrawl.org/${path}`;
  for (let i = 0; i < 10; i++) {
    try {
      await fetchGzipTextFile(url, async (lines) => {
        const domains: string[] = [];
        for (const line of lines) {
          if (line.startsWith("WARC-Target-URI: ")) {
            const url = line.slice(17);
            const match = url.match(baseDomainRegex);
            if (match && match.length >= 2) {
              domains.push(match[1]);
            }
          }
        }

        if (domains.length) {
          await onDomain(domains);
        }
      });
    } catch (e) {
      console.error(`Failed to process ${url}, retrying...`, e);
      await setTimeout(5000);
    }
  }
};

interface CCStreamProgress {
  processed: number;
  total: number;
}

interface CCStreamHandlers {
  onDomain: DomainsHandler;
  onProgress: (progress: CCStreamProgress) => void | Promise<void>;
  onCalculatedTotal: (total: number) => void | Promise<void>;
}

const retry = async <T>(callback: () => Promise<T>): Promise<T> => {
  let lastError: Error | undefined;
  for (let i = 0; i < 3; i++) {
    try {
      return await callback();
    } catch (e) {
      lastError = e as Error;
      await setTimeout(5000);
    }
  }
  if (lastError) {
    throw lastError;
  }
  throw new Error("Unexpected retry error");
};

export async function withCcDataStream(
  dataset: string,
  {
    onFileStream,
    onCalculatedTotal,
  }: {
    onFileStream: (
      filePath: string,
      stream: ReadableStream,
    ) => void | Promise<void>;
    onCalculatedTotal: (total: number) => void | Promise<void>;
  },
) {
  const files = await listFiles(dataset);
  await onCalculatedTotal(files.length);
  const queue = new Queue(10);

  await Promise.all(
    files.map((filePath) => {
      return queue.add(async () => {
        const url = `https://data.commoncrawl.org/${filePath}`;
        try {
          await retry(async () => {
            const response = await tryFetch(url);
            const body = response.body;
            if (!body) {
              return;
            }
            await onFileStream(filePath, response.body);
          });
        } catch (err) {
          console.error(`Error processing file ${url}`, err);
        }
      });
    }),
  );
}

export default async function withCcDomainStream(
  dataset: string,
  skip: number | undefined,
  { onDomain, onProgress, onCalculatedTotal }: CCStreamHandlers,
) {
  let files = await listFiles(dataset);
  await onCalculatedTotal(files.length);
  const queue = new Queue(10);
  let processed = skip ?? 0;

  if (skip) {
    files = files.slice(skip);
  }

  await Promise.all(
    files.map(async (path) => {
      await queue.add(() => retry(() => processStream(path, onDomain)));

      onProgress({
        processed: ++processed,
        total: files.length,
      });
    }),
  );
}
