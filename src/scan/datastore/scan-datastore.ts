import { Store } from "../../store/store";
import { CheckerMap } from "../checkers";
import Queue from "promise-queue";
import { setTimeout } from "node:timers/promises";
import { onSuccess } from "../../scan-utils";
import { checkUrl } from "../../utils/check-url";
import { startEta } from "../../eta";
import {
  waitForEmptyQueue,
  waitUntilQueueHasLessThanN,
} from "../../utils/queue-utils";

interface ScanDatastoreProps {
  store: Store;
  checks: CheckerMap;
}

export default async function scanDatastore(props: ScanDatastoreProps) {
  const totalCount = await props.store.countRecords();
  const queue = new Queue(100);
  let processed = 0;
  const eta = startEta(totalCount);

  for await (const url of props.store.iterateUrls()) {
    if (queue.getQueueLength() > 10000) {
      await waitUntilQueueHasLessThanN(queue, 100);
    }
    queue.add(() =>
      checkUrl(url, props.checks)
        .then((result) => onSuccess([props.store], url, result))
        .then(() => {
          processed++;

          const data = eta.get(processed);
          console.log(
            `Processed ${processed}/${totalCount} (${Math.round(processed / (totalCount / 100))}%) domains\tElapsed: ${data.elapsedHuman}; Remaining: ${data.remainingHuman}`,
          );
        }),
    );
  }

  await waitForEmptyQueue(queue);

  console.log("Done");
}
