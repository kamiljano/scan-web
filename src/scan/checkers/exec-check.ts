import {
  CheckerResult,
  CheckerSuccessResult,
  CheckerValidation,
} from "./checker";
import { setTimeout } from "node:timers/promises";

export interface CheckResult<TResult extends CheckerResult = CheckerResult> {
  result: TResult;
  checker: string;
}

export const execCheck = async (url: string, checkers: CheckerValidation[]) => {
  const controller = new AbortController();
  setTimeout(4000).then(() => controller.abort());
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
