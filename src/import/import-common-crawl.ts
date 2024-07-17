import withCcDomainStream, { listFiles } from '../utils/with-cc-domain-stream';
import { Store } from '../store/store';
import { startEta } from '../eta';
import * as process from 'node:process';
import _ from 'lodash';
import fs from 'node:fs';
import Batch from 'src/utils/batch';

interface ImportCommonCrawlProps {
  dataset: string;
  stores: Store[];
  skip: number;
  onlyList: boolean;
  splitListEvery: number | undefined;
  batchId: number | undefined;
  fromBatchFile: string | undefined;
}

const readFiles = async (props: ImportCommonCrawlProps) => {
  const files = await listFiles(props.dataset);

  if (props.splitListEvery) {
    console.log(JSON.stringify(_.chunk(files, props.splitListEvery), null, 2));
  } else {
    console.log(JSON.stringify(files, null, 2));
  }

  process.exit(0);
};

const importDomains = async (props: ImportCommonCrawlProps) => {
  let eta: ReturnType<typeof startEta>;

  let files: string[] | undefined = undefined;

  if (props.fromBatchFile) {
    const batchData = JSON.parse(
      await fs.promises.readFile(props.fromBatchFile, 'utf-8'),
    );
    if (typeof props.batchId !== 'undefined') {
      files = batchData[props.batchId];
    } else {
      files = batchData;
    }
  }

  const batch = new Batch<string>(500, async (urls) => {
    await Promise.all(
      props.stores.map((store) => {
        store.insertUrls(urls);
      }),
    );
  });

  await withCcDomainStream(
    props.dataset,
    {
      skip: props.skip,
      files,
    },
    {
      async onDomain(domains) {
        await batch.add(domains);
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
    },
  );

  await batch.finish();
};

export default async function importCommonCrawl(props: ImportCommonCrawlProps) {
  if (props.onlyList) {
    await readFiles(props);
  } else {
    await importDomains(props);
  }
}
