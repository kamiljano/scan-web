import { CheckerValidation, textDecoder } from "./checker";

const directoryExposed = async (url: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url.replace(/\/HEAD$/, ""), {
      signal: controller.signal,
    });
    if (!response.ok) {
      return false;
    }
    const body = await response.text();
    return (
      body.includes("<html") &&
      body.includes(">HEAD<") &&
      body.includes(">index<")
    );
  } catch (err) {
    return false;
  }
};

export const git: CheckerValidation = async (ctx) => {
  if (ctx.body && ctx.body.length) {
    const body = textDecoder.decode(ctx.body);
    if (body.startsWith("ref:")) {
      return {
        success: true,
        meta: {
          url: ctx.url,
          directoryExposed: await directoryExposed(ctx.url),
        },
      };
    }
  }

  return {
    success: false,
  };
};
