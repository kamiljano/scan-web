import { Duration } from 'luxon';

export const toHuman = (ms: number) =>
  Duration.fromMillis(ms)
    .shiftTo('days', 'hours', 'minutes', 'seconds')
    .toHuman({
      unitDisplay: 'short',
    });
