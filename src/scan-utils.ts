import console from "node:console";
import { CheckerSuccessMeta } from "./scan/checkers/checker";
import { Store } from "./store/store";

export interface SuccessfulScanResult {
  checker: string;
  meta: CheckerSuccessMeta;
}

export const onSuccess = async (
  stores: Store[],
  url: string,
  result: SuccessfulScanResult[],
) => {
  if (result.length) {
    console.log(`Check passed: ${JSON.stringify(result)}`);
    console.log(result);

    await Promise.all(
      stores.flatMap(async (store) => {
        return result.flatMap(async (r) => {
          await store.store({
            url,
            source: r.checker,
            meta: r.meta,
          });
        });
      }),
    );
  }
};
