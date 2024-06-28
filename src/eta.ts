import { toHuman } from "./utils/date-time";

export const startEta = (total: number) => {
  const start = Date.now();

  return {
    get(processed: number) {
      const elapsed = Date.now() - start;
      const remaining = (total - processed) * (elapsed / processed);

      return {
        elapsed,
        remaining,
        get elapsedHuman() {
          return toHuman(elapsed);
        },
        get remainingHuman() {
          return toHuman(remaining);
        },
      };
    },
  };
};
