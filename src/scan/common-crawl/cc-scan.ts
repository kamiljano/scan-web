import withCcStream from "../../utils/with-cc-stream";
import Queue from "promise-queue";
import { CheckerMap } from "../checkers";
import { Store } from "../../store/store";
import { onSuccess } from "../../scan-utils";
import { startEta } from "../../eta";
import console from "node:console";
import { Duration } from "luxon";
import { checkUrl } from "../../utils/check-url";
import {
  waitForEmptyQueue,
  waitUntilQueueHasLessThanN,
} from "../../utils/queue-utils";

interface CcScanParams {
  dataset: string;
  checks: CheckerMap;
  stores: Store[];
  skip?: number;
}

const QUEUE_SIZE = 100;

export default async function ccScan(props: CcScanParams) {
  const queue = new Queue(QUEUE_SIZE);

  let eta: ReturnType<typeof startEta>;
  let totalDomains = 0;
  let lastTotalPrinted = 0;

  await withCcStream(props.dataset, props.skip, {
    onCalculatedTotal(total) {
      eta = startEta(total);
      console.log(`Total files found in Common Crawl: ${total}`);
    },
    async onDomain(domains) {
      totalDomains += domains.length;
      if (totalDomains - lastTotalPrinted >= 1000) {
        console.log(`Total domains found: ${totalDomains}`);
        lastTotalPrinted = totalDomains;
      }
      domains.map((url) =>
        queue.add(() =>
          checkUrl(url, props.checks).then((result) =>
            onSuccess(props.stores, url, result),
          ),
        ),
      );

      if (queue.getQueueLength() > 10000) {
        await waitUntilQueueHasLessThanN(queue, QUEUE_SIZE);
      }
    },
    onProgress(progress) {
      const data = eta.get(progress.processed);
      console.log(
        `Processed ${progress.processed} out of ${progress.total} files\tElapsed: ${Duration.fromMillis(
          data.elapsed,
        )
          .shiftTo("hours", "minutes", "seconds")
          .toHuman({
            unitDisplay: "short",
          })}; Remaining: ${Duration.fromMillis(data.remaining)
          .shiftTo("hours", "minutes", "seconds")
          .toHuman({
            unitDisplay: "short",
          })}`,
      );
    },
  });

  await waitForEmptyQueue(queue);
}
