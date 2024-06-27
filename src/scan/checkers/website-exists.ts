import { CheckerValidation } from "./checker";
import * as dns from "node:dns/promises";

export const websiteExists: CheckerValidation = async (ctx) => {
  if (!ctx.body) {
    return {
      success: false,
    };
  }

  const domains = await dns.reverse("216.58.211.238");

  return {
    success: true,
    meta: {
      url: ctx.url,
      domains: domains,
    },
  };
};
