import { Worker } from "worker_threads";
import * as path from "node:path";
import * as console from "node:console";
import { ipv4ToNumber } from "ipterate";
import { request } from "./check-ip";
import { startEta } from "./eta";
import { Duration } from "luxon";
import { CheckerMap } from "./checkers";
import { Store } from "./store/store";

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

interface ScanProps {
  from: string;
  to: string;
  checks: CheckerMap;
  stores: Store[];
}

export default async function scan(props: ScanProps): Promise<void> {
  let numberOfIps = 0;
  let numberOfProcessedIps = 0;

  const from = props.from;
  const to = props.to;
  const eta = startEta(ipv4ToNumber(to) - ipv4ToNumber(from));

  let lastEtaUpdate: number | undefined = undefined;

  await generateIps(from, to, (ip) => {
    numberOfIps++;

    request(ip, props.checks)
      .then(async (result) => {
        if (result.length) {
          console.log(`Check passed: ${JSON.stringify(result)}`);
          console.log(result);

          await Promise.all(
            props.stores.flatMap(async (store) => {
              return result.flatMap(async (r) => {
                const { url, ...meta } = r.meta;
                await store.store({
                  url,
                  source: r.checker,
                  meta,
                });
              });
            }),
          );
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

  console.log("Done");
}
