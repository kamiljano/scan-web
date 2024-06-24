import { CheckerValidation } from "./checker";

export const gitChecker: CheckerValidation = (ctx) => {
  if (ctx.body && ctx.body.length) {
    return {
      success: true,
      meta: {
        url: ctx.url,
      },
    };
  }

  return {
    success: false,
  };
};
