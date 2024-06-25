import { CheckerSuccessResult } from "../checkers/checker";
import { CheckerMap } from "../checkers";
import { execCheck, CheckResult } from "../checkers/exec-check";
import { SuccessfulScanResult } from "../scan-utils";

export const request = async (
  ip: string,
  checkerMap: CheckerMap,
): Promise<SuccessfulScanResult[]> => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 2000);

  const paths = Object.entries(checkerMap);

  const result = await Promise.allSettled(
    paths.flatMap(([path, checkers]) => {
      return [
        execCheck(`http://${ip}/${path}`, checkers),
        execCheck(`https://${ip}/${path}`, checkers),
      ].flat();
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
