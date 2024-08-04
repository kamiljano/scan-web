interface CheckerContext {
  /**
   * HTTP(s) Request body
   */
  body?: string;

  /**
   * URL of the page
   */
  url: string;
}

export type CheckerSuccessMeta = Record<
  string,
  boolean | string | number | string[]
>;

export interface CheckerSuccessResult {
  success: true;
  meta: CheckerSuccessMeta;
}

interface CheckerFailureResult {
  success: false;
}

export type CheckerResult = CheckerSuccessResult | CheckerFailureResult;

export type CheckerValidation = (
  body: CheckerContext,
) => CheckerResult | Promise<CheckerResult>;

export const textDecoder = new TextDecoder();
