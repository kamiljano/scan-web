import zlib from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Writable, Transform } from "node:stream";
import Queue from "promise-queue";

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

const baseDomainRegex = /^https?:\/\/[\w.]+\/?$/;

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

interface CCStreamProgress {
  processed: number;
  total: number;
}

interface CCStreamHandlers {
  onDomain: (domains: string[]) => void | Promise<void>;
  onProgress: (progress: CCStreamProgress) => void | Promise<void>;
  onCalculatedTotal: (total: number) => void | Promise<void>;
}

export default async function withCcStream(
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
      await queue.add(() =>
        fetchGzipTextFile(
          `https://data.commoncrawl.org/${path}`,
          async (lines) => {
            const domains: string[] = [];
            for (const line of lines) {
              if (line.startsWith("WARC-Target-URI: ")) {
                const url = line.slice(17);
                if (baseDomainRegex.test(url)) {
                  domains.push(url.replace(/\/$/, ""));
                }
              }
            }

            if (domains.length) {
              await onDomain(domains);
            }
          },
        ),
      );

      onProgress({
        processed: ++processed,
        total: files.length,
      });
    }),
  );
}
