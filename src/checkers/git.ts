import { CheckerValidation, textDecoder } from "./checker";

export const git: CheckerValidation = (ctx) => {
  if (ctx.body && ctx.body.length) {
    const body = textDecoder.decode(ctx.body);
    if (body.startsWith("ref:")) {
      return {
        success: true,
        meta: {
          url: ctx.url,
        },
      };
    }
  }

  return {
    success: false,
  };
};
