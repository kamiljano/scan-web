import withCcDomainStream from "../utils/with-cc-domain-stream";
import { Store } from "../store/store";
import { startEta } from "../eta";

interface ImportCommonCrawlProps {
  dataset: string;
  stores: Store[];
  skip: number;
}

export default async function importCommonCrawl(props: ImportCommonCrawlProps) {
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
}
