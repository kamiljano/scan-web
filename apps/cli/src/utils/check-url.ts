import { SuccessfulScanResult } from "../scan-utils";
import { setTimeout } from "node:timers/promises";
import { CheckResult, execCheck } from "../scan/checkers/exec-check";
import { CheckerSuccessResult } from "../scan/checkers/checker";
import { CheckerMap } from "../scan/checkers";

export const checkUrl = async (
  url: string,
  checks: CheckerMap,
): Promise<SuccessfulScanResult[]> => {
  const controller = new AbortController();
  setTimeout(2000).then(() => controller.abort());

  const paths = Object.entries(checks);

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
