import { Duration } from "luxon";

const toHuman = (ms: number) =>
  Duration.fromMillis(ms).shiftTo("hours", "minutes", "seconds").toHuman({
    unitDisplay: "short",
  });

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
