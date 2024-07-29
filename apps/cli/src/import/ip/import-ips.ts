import { Worker } from 'worker_threads';
import * as path from 'node:path';
import * as console from 'node:console';
import { ipv4ToNumber } from 'ipterate';
import * as fs from 'node:fs';
import { startEta } from '../../eta';
import { checkIp } from './check-ip';
import { Store } from '../../store/store';

const getWorkerPath = () => {
  let result = path.resolve(__dirname, 'generate-ips-worker.ts');

  if (!fs.existsSync(result)) {
    result = path.resolve(__dirname, 'generate-ips-worker.js');
  }

  return result;
};

type MemoryControl = (action: 'pause' | 'resume') => void;

const generateIps = (
  from: string,
  to: string,
  verbose: boolean,
  onIp: (ip: string, memoryControl: MemoryControl) => void | Promise<void>,
) =>
  new Promise<void>((resolve, reject) => {
    const ipWorker = new Worker(getWorkerPath(), {
      workerData: {
        from,
        to,
        verbose,
      },
    });

    const memoryControl: MemoryControl = (action) => {
      ipWorker.postMessage({
        pause: action === 'pause',
      });
    };

    ipWorker.on('message', (ip: string) => {
      onIp(ip, memoryControl);
    });

    ipWorker.once('exit', () => {
      resolve();
    });

    ipWorker.once('error', (err) => {
      reject(err);
    });
  });

interface ImportIpsProps {
  from: string;
  to: string;
  stores: Store[];
  verbose: boolean;
}

export default async function importIps(props: ImportIpsProps): Promise<void> {
  let numberOfIps = 0;
  let numberOfProcessedIps = 0;

  const from = props.from;
  const to = props.to;
  const eta = startEta(ipv4ToNumber(to) - ipv4ToNumber(from));

  let lastEtaUpdate: number | undefined = undefined;

  let paused = false;

  await generateIps(from, to, props.verbose, (ip, memoryControl) => {
    numberOfIps++;

    checkIp(ip)
      .then(async (result) => {
        if (result.length) {
          if (props.verbose) {
            console.log(`Found domains for ip ${ip}`, result);
          }
          await Promise.all(
            props.stores.map((store) => store.insertUrls(result)),
          );
        }
      })
      .finally(() => {
        numberOfProcessedIps++;

        const diffBetweenQueuedAndProcessed =
          numberOfIps - numberOfProcessedIps;

        if (!paused && diffBetweenQueuedAndProcessed > 1000) {
          memoryControl('pause');
          paused = true;
          if (props.verbose) {
            console.log('Thread throttling issued');
          }
        } else if (paused && diffBetweenQueuedAndProcessed < 100) {
          memoryControl('resume');
          paused = false;
          if (props.verbose) {
            console.log('Thread resume issued');
          }
        }

        if (numberOfProcessedIps % 1000 === 0) {
          const data = eta.get(numberOfProcessedIps);
          let lastEtaUpdateLabel: string = '';
          if (lastEtaUpdate) {
            lastEtaUpdateLabel = `Last update took: ${Date.now() - lastEtaUpdate}ms`;
          }
          lastEtaUpdate = Date.now();
          console.log(
            `Processed: ${ip} - ${numberOfProcessedIps}/${numberOfIps}\tElapsed: ${data.elapsedHuman}; Remaining: ${data.remainingHuman}; ${lastEtaUpdateLabel}`,
          );
        }
      });
  });

  console.log('Done');
}
