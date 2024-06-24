import { CheckerValidation } from "./checker";

export const websiteExists: CheckerValidation = async (ctx) => {
  if (!ctx.body) {
    return {
      success: false,
    };
  }

  return {
    success: true,
    meta: {
      url: ctx.url,
    },
  };
};
