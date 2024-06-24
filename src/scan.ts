import { Worker } from "worker_threads";
import * as path from "node:path";
import * as console from "node:console";
import { ipv4ToNumber } from "ipterate";
import { request } from "./check-ip";
import Queue from "promise-queue";
import { setTimeout } from "node:timers/promises";
import { startEta } from "./eta";
import { Duration } from "luxon";
import { CheckerMap } from "./checkers";

const generateIps = (
  from: string,
  to: string,
  onIp: (ip: string) => void | Promise<void>,
) =>
  new Promise<void>((resolve, reject) => {
    const ipWorker = new Worker(
      path.resolve(__dirname, "generate-ips-worker.ts"),
      {
        workerData: {
          from,
          to,
        },
      },
    );

    ipWorker.on("message", (ip: string) => {
      onIp(ip);
    });

    ipWorker.once("exit", () => {
      resolve();
    });

    ipWorker.once("error", (err) => {
      reject(err);
    });
  });

const waitForEmptyQueue = async (queue: Queue) => {
  while (queue.getQueueLength()) {
    await setTimeout(1000);
  }
};

interface ScanProps {
  from: string;
  to: string;
  checks: CheckerMap;
}

export default async function scan(props: ScanProps): Promise<void> {
  let numberOfIps = 0;
  let numberOfProcessedIps = 0;

  const from = "0.0.0.0";
  const to = "255.255.255.255";
  const eta = startEta(ipv4ToNumber(to) - ipv4ToNumber(from));

  const queue = new Queue(1000);

  let lastEtaUpdate: number | undefined = undefined;

  await generateIps(from, to, (ip) => {
    numberOfIps++;

    // queue
    //   .add(() => request(ip))
    request(ip)
      .then((result) => {
        if (result.length) {
          console.log(`Check passed: ${JSON.stringify(result)}`);
          console.log(result);
        }
      })
      .finally(() => {
        numberOfProcessedIps++;
        if (numberOfProcessedIps % 1000 === 0) {
          const data = eta.get(numberOfProcessedIps);
          let lastEtaUpdateLabel: string = "";
          if (lastEtaUpdate) {
            lastEtaUpdateLabel = `Last update took: ${Date.now() - lastEtaUpdate}ms`;
          }
          lastEtaUpdate = Date.now();
          console.log(
            `Processed: ${ip} - ${numberOfProcessedIps}/${numberOfIps}\tElapsed: ${Duration.fromMillis(
              data.elapsed,
            )
              .shiftTo("hours", "minutes", "seconds")
              .toHuman({
                unitDisplay: "short",
              })}; Remaining: ${Duration.fromMillis(data.remaining)
              .shiftTo("hours", "minutes", "seconds")
              .toHuman({
                unitDisplay: "short",
              })}; ${lastEtaUpdateLabel}`,
          );
        }
      });
  });

  //await waitForEmptyQueue(queue);
  console.log("Done");
}
