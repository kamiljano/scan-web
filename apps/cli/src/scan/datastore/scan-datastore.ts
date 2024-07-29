import { Store } from '../../store/store';
import { CheckerMap } from '../checkers';
import Queue from 'promise-queue';
import { onSuccess } from '../../scan-utils';
import { checkUrl } from '../../utils/check-url';
import { startEta } from '../../eta';
import {
  waitForEmptyQueue,
  waitUntilQueueHasLessThanN,
} from '../../utils/queue-utils';

interface ScanDatastoreProps {
  store: Store;
  checks: CheckerMap;
  verbose: boolean;
  read: number | undefined;
  skip: number | undefined;
}

export default async function scanDatastore(props: ScanDatastoreProps) {
  const totalCount = props.read ?? (await props.store.countSites());
  const queue = new Queue(100);
  let processed = 0;
  const eta = startEta(totalCount);

  for await (const url of props.store.iterateUrls({
    read: props.read,
    skip: props.skip,
  })) {
    if (queue.getQueueLength() > 10000) {
      await waitUntilQueueHasLessThanN(queue, 100);
    }
    queue.add(() => {
      if (props.verbose) {
        console.log(`Processing ${url}`);
      }
      return checkUrl(url, props.checks)
        .then((result) => onSuccess([props.store], url, result))
        .then(() => {
          processed++;

          const data = eta.get(processed);
          console.log(
            `Processed ${processed}/${totalCount} (${Math.round(processed / (totalCount / 100))}%) domains\tElapsed: ${data.elapsedHuman}; Remaining: ${data.remainingHuman}`,
          );
        });
    });
  }

  await waitForEmptyQueue(queue);

  console.log('Done');
}
