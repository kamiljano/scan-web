import { Duration } from "luxon";

export const toHuman = (ms: number) =>
  Duration.fromMillis(ms).shiftTo("hours", "minutes", "seconds").toHuman({
    unitDisplay: "short",
  });
