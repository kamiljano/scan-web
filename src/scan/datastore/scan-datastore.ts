import { Store } from "../../store/store";
import { CheckerMap } from "../../checkers";
import Queue from "promise-queue";
import { setTimeout } from "node:timers/promises";
import { onSuccess } from "../../scan-utils";
import { checkUrl } from "../../utils/check-url";
import { startEta } from "../../eta";

interface ScanDatastoreProps {
  store: Store;
  checks: CheckerMap;
}

// TODO: it is extracted already into a separate file in another branch. Use that instead
const waitForEmptyQueue = async (queue: Queue) => {
  while (queue.getQueueLength()) {
    await setTimeout(1000);
  }
};

const waitUntilQueueHasLessThanN = async (queue: Queue, n: number) => {
  while (queue.getQueueLength() > n) {
    await setTimeout(1000);
  }
};

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
        .then(onSuccess([props.store]))
        .then(() => {
          processed++;

          const data = eta.get(processed);
          console.log(
            `Processed ${processed}/${totalCount} (${Math.round(processed / (totalCount / 100))}%)domains\tElapsed: ${data.elapsedHuman}; Remaining: ${data.remainingHuman}`,
          );
        }),
    );
  }

  await waitForEmptyQueue(queue);
}
