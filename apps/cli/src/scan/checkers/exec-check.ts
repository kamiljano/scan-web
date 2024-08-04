import axios from 'axios';
import {
  CheckerResult,
  CheckerSuccessResult,
  CheckerValidation,
} from './checker';

export interface CheckResult<TResult extends CheckerResult = CheckerResult> {
  result: TResult;
  checker: string;
}

export const execCheck = async (url: string, checkers: CheckerValidation[]) => {
  const response = await axios.get(url, {
    timeout: 5000,
  });

  const result = await Promise.allSettled(
    checkers.map(async (checker): Promise<CheckResult> => {
      const result = await checker({
        url,
        body: response.data,
      });

      return {
        result,
        checker: checker.name,
      };
    }),
  );

  return result
    .filter((r) => r.status === 'fulfilled' && r.value.result.success)
    .map(
      (r) =>
        (r as PromiseFulfilledResult<CheckResult<CheckerSuccessResult>>).value,
    );
};
