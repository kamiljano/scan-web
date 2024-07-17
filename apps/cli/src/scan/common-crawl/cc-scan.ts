import withCcDomainStream from "../../utils/with-cc-domain-stream";
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
import fs from "node:fs";
import { z } from "zod";

interface CcScanParams {
  dataset: string;
  checks: CheckerMap;
  stores: Store[];
  skip?: number;
  fromBatchFile?: string;
  batchId?: number;
}

const QUEUE_SIZE = 100;

const BatchedData = z.string().array().array();
const StringArray = z.string().array();

const tryGetFilesToScan = (props: CcScanParams): string[] | undefined => {
  if (!props.fromBatchFile) {
    return undefined;
  }
  const batchFile = JSON.parse(fs.readFileSync(props.fromBatchFile, "utf-8"));
  if (props.batchId) {
    return BatchedData.parse(batchFile)[props.batchId];
  }
  return StringArray.parse(batchFile);
};

export default async function ccScan(props: CcScanParams) {
  const queue = new Queue(QUEUE_SIZE);

  let eta: ReturnType<typeof startEta>;
  let totalDomains = 0;
  let lastTotalPrinted = 0;

  await withCcDomainStream(
    props.dataset,
    {
      skip: props.skip,
      files: tryGetFilesToScan(props),
    },
    {
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
    },
  );

  await waitForEmptyQueue(queue);
}
