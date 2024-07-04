import withCcDomainStream, { listFiles } from "../utils/with-cc-domain-stream";
import { Store } from "../store/store";
import { startEta } from "../eta";
import fs from "node:fs/promises";
import * as process from "node:process";
import _ from "lodash";

interface ImportCommonCrawlProps {
  dataset: string;
  stores: Store[];
  skip: number;
  onlyList: boolean;
  splitListEvery: number | undefined;
}

const readFiles = async (props: ImportCommonCrawlProps) => {
  const files = await listFiles(props.dataset);

  if (props.splitListEvery) {
    await fs.writeFile(
      "cc-files.json",
      JSON.stringify(_.chunk(files, props.splitListEvery), null, 2),
    );
  } else {
    await fs.writeFile("cc-files.json", JSON.stringify(files, null, 2));
  }

  console.log("done");
  process.exit(0);
};

const importDomains = async (props: ImportCommonCrawlProps) => {
  let eta: ReturnType<typeof startEta>;

  await withCcDomainStream(props.dataset, props.skip, {
    async onDomain(domains) {
      await Promise.allSettled(
        domains.flatMap((domain) =>
          props.stores.map((store) => store.store(domain)),
        ),
      );
    },
    onCalculatedTotal(total) {
      console.log(`Total Common Crawl data files: ${total}`);
      eta = startEta(total);
    },
    onProgress(progress) {
      const etaResult = eta.get(progress.processed);

      console.log(
        `Processed ${progress.processed}/${progress.total} (${Math.round(progress.processed / (progress.total / 100))}%): Elapsed: ${etaResult.elapsedHuman}; Remaining: ${etaResult.remainingHuman}`,
      );
    },
  });
};

export default async function importCommonCrawl(props: ImportCommonCrawlProps) {
  if (props.onlyList) {
    await readFiles(props);
  } else {
    await importDomains(props);
  }
}
