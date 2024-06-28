import Queue from "promise-queue";
import { setTimeout } from "node:timers/promises";

export const waitForEmptyQueue = async (queue: Queue) => {
  while (queue.getQueueLength() || queue.getPendingLength()) {
    await setTimeout(1000);
  }
};

export const waitUntilQueueHasLessThanN = async (queue: Queue, n: number) => {
  while (queue.getQueueLength() > n) {
    await setTimeout(1000);
  }
};
