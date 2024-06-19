import { Worker } from "worker_threads";
import * as path from "node:path";
import * as console from "node:console";
import { request } from "./check-ip";
import Queue from "promise-queue";
import { setTimeout } from "node:timers/promises";

const generateIps = (onIp: (ip: string) => void | Promise<void>) =>
  new Promise<void>((resolve, reject) => {
    const ipWorker = new Worker(
      path.resolve(__dirname, "generate-ips-worker.ts"),
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

(async () => {
  let numberOfIps = 0;
  let numberOfProcessedIps = 0;

  const queue = new Queue(1000);

  await generateIps((ip) => {
    numberOfIps++;

    queue
      .add(() => request(ip))
      .then((result) => {
        if (result.length) {
          console.log(`Check passed: ${JSON.stringify(result)}`);
          console.log(result);
        }
      })
      .finally(() => {
        numberOfProcessedIps++;
        console.log(`Processed: ${numberOfProcessedIps}/${numberOfIps}`);
      });
  });

  await waitForEmptyQueue(queue);
  console.log("Done");
})();
