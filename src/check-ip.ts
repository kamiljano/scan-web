import {
  CheckerSuccessResult,
  CheckerResult,
  CheckerValidation,
} from "./checkers/checker";
import { checkerMap } from "./checkers";

interface CheckResult<TResult extends CheckerResult = CheckerResult> {
  result: TResult;
  checker: string;
}

const check = async (url: string, checkers: CheckerValidation[]) => {
  const controller = new AbortController();
  const response = await fetch(url, { signal: controller.signal });

  if (!response.ok) {
    throw new Error("Failed to fetch the page");
  }

  let body: Uint8Array | undefined = undefined;
  try {
    body = new Uint8Array(await response.arrayBuffer());
  } catch {
    // ignore
  }

  const result = await Promise.allSettled(
    checkers.map(async (checker): Promise<CheckResult> => {
      const result = await checker({
        url,
        body,
      });

      return {
        result,
        checker: checker.name,
      };
    }),
  );

  return result
    .filter((r) => r.status === "fulfilled" && r.value.result.success)
    .map(
      (r) =>
        (r as PromiseFulfilledResult<CheckResult<CheckerSuccessResult>>).value,
    );
};

export const request = async (ip: string) => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 2000);

  const paths = Object.entries(checkerMap);

  const result = await Promise.allSettled(
    paths.flatMap(([path, checkers]) => {
      return [
        check(`http://${ip}/${path}`, checkers),
        check(`https://${ip}/${path}`, checkers),
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
  const successfulChecks = successfulRequest
    .filter((r) => r.result.success)
    .map((r) => ({
      checker: r.checker,
      meta: r.result.meta,
    }));

  return successfulChecks;
};
