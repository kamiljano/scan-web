import { parentPort, workerData } from 'worker_threads';
import { iterateIpV4Addresses } from 'ipterate';
import { setTimeout } from 'node:timers/promises';
import * as console from 'node:console';

let paused = false;

(async () => {
  for (const ip of iterateIpV4Addresses({
    from: workerData.from,
    to: workerData.to,
  })) {
    // Throttle the generation, or all memory will be consumed
    await setTimeout(1);
    parentPort?.postMessage(ip);

    while (paused) {
      if (workerData.verbose) {
        console.log('Generation paused. Waiting for a resume event...');
      }

      await setTimeout(1000);
    }
  }
})();

parentPort?.on('message', (data) => {
  if (workerData.verbose) {
    console.log(`Throttling information received. Pause: ${data.pause}`);
  }
  paused = data.pause;
});
