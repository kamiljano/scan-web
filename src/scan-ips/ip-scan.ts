import { Worker } from "worker_threads";
import * as path from "node:path";
import * as console from "node:console";
import { ipv4ToNumber } from "ipterate";
import { request } from "./check-ip";
import { startEta } from "../eta";
import { Duration } from "luxon";
import { CheckerMap } from "../checkers";
import { Store } from "../store/store";
import * as fs from "node:fs";
import { onSuccess } from "../scan-utils";

const getWorkerPath = () => {
  let result = path.resolve(__dirname, "generate-ips-worker.ts");

  if (!fs.existsSync(result)) {
    result = path.resolve(__dirname, "generate-ips-worker.js");
  }

  return result;
};

type MemoryControl = (action: "pause" | "resume") => void;

const generateIps = (
  from: string,
  to: string,
  onIp: (ip: string, memoryControl: MemoryControl) => void | Promise<void>,
) =>
  new Promise<void>((resolve, reject) => {
    const ipWorker = new Worker(getWorkerPath(), {
      workerData: {
        from,
        to,
      },
    });

    const memoryControl: MemoryControl = (action) => {
      ipWorker.postMessage({
        pause: action === "pause",
      });
    };

    ipWorker.on("message", (ip: string) => {
      onIp(ip, memoryControl);
    });

    ipWorker.once("exit", () => {
      resolve();
    });

    ipWorker.once("error", (err) => {
      reject(err);
    });
  });

interface IpScanProps {
  from: string;
  to: string;
  checks: CheckerMap;
  stores: Store[];
}

export default async function ipScan(props: IpScanProps): Promise<void> {
  let numberOfIps = 0;
  let numberOfProcessedIps = 0;

  const from = props.from;
  const to = props.to;
  const eta = startEta(ipv4ToNumber(to) - ipv4ToNumber(from));

  let lastEtaUpdate: number | undefined = undefined;

  let paused = false;

  await generateIps(from, to, (ip, memoryControl) => {
    numberOfIps++;

    request(ip, props.checks)
      .then(onSuccess(props.stores))
      .finally(() => {
        numberOfProcessedIps++;

        const diffBetweenQueuedAndProcessed =
          numberOfIps - numberOfProcessedIps;

        if (!paused && diffBetweenQueuedAndProcessed > 1000) {
          memoryControl("pause");
          paused = true;
          console.log("Thread throttling issued");
        } else if (paused && diffBetweenQueuedAndProcessed < 100) {
          memoryControl("resume");
          paused = false;
          console.log("Thread resume issued");
        }

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

  console.log("Done");
}
