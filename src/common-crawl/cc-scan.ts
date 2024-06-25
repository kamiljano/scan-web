import withCcStream from "./with-cc-stream";
import Queue from "promise-queue";
import { setTimeout } from "node:timers/promises";
import { CheckerMap } from "../checkers";
import { Store } from "../store/store";
import { execCheck, CheckResult } from "../checkers/exec-check";
import { CheckerSuccessResult } from "../checkers/checker";
import { onSuccess, SuccessfulScanResult } from "../scan-utils";
import { startEta } from "../eta";
import console from "node:console";
import { Duration } from "luxon";

interface CcScanParams {
  dataset: string;
  checks: CheckerMap;
  stores: Store[];
}

export const checkUrl = async (
  url: string,
  props: Pick<CcScanParams, "checks" | "stores">,
): Promise<SuccessfulScanResult[]> => {
  const controller = new AbortController();
  setTimeout(2000).then(() => controller.abort());

  const paths = Object.entries(props.checks);

  const result = await Promise.allSettled(
    paths.flatMap(([path, checkers]) => {
      return execCheck(`${url}/${path}`, checkers);
    }),
  );

  const successfulRequest = result
    .filter((r) => r.status === "fulfilled")
    .flatMap(
      (r) =>
        (r as PromiseFulfilledResult<CheckResult<CheckerSuccessResult>[]>)
          .value,
    );

  return successfulRequest
    .filter((r) => r.result.success)
    .map((r) => ({
      checker: r.checker,
      meta: r.result.meta,
    }));
};

const waitForEmptyQueue = async (queue: Queue) => {
  while (queue.getQueueLength()) {
    await setTimeout(1000);
  }
};

export default async function ccScan(props: CcScanParams) {
  const queue = new Queue(100);

  let eta: ReturnType<typeof startEta>;

  await withCcStream(props.dataset, {
    onCalculatedTotal(total) {
      eta = startEta(total);
      console.log(`Total files found in Common Crawl: ${total}`);
    },
    onDomain(domains) {
      domains.map((url) =>
        queue.add(() => checkUrl(url, props).then(onSuccess(props.stores))),
      );
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
