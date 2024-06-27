import withCcStream from "../utils/with-cc-stream";
import { Store } from "../store/store";
import { startEta } from "../eta";

interface ImportCommonCrawlProps {
  dataset: string;
  stores: Store[];
}

export default async function importCommonCrawl(props: ImportCommonCrawlProps) {
  let eta: ReturnType<typeof startEta>;

  await withCcStream(props.dataset, 0, {
    async onDomain(domains) {
      await Promise.all(
        domains.flatMap((domain) =>
          props.stores.map((store) => store.store(domain)),
        ),
      );
    },
    onCalculatedTotal(total) {
      console.log(`Total domains: ${total}`);
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
