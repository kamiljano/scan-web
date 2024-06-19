import { CheckerValidation, textDecoder } from "./checker";
import { load } from "cheerio";

const getScript = async (src: string, url: string) => {
  const scriptUrl = src.startsWith("http") ? src : `${url}/${src}`;
  const scriptResponse = await fetch(scriptUrl);
  return scriptResponse.text();
};

export const firestoreChecker: CheckerValidation = async (ctx) => {
  if (!ctx.body) {
    return {
      success: false,
    };
  }

  const body = textDecoder.decode(ctx.body);
  const $ = load(body);
  const scripts = $("script");

  const results = await Promise.allSettled(
    scripts.map(async (_, script) => {
      const src = $(script).attr("src");
      if (src) {
        if (src.includes("firestore")) {
          return true;
        } else {
          const scriptBody = await getScript(src, ctx.url);
          if (scriptBody.includes("firestore")) {
            return true;
          }
        }
      }

      return false;
    }),
  );

  if (results.some((result) => result.status === "fulfilled" && result.value)) {
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
