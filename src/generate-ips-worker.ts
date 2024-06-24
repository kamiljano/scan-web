import { parentPort, workerData } from "worker_threads";
import { iterateIpV4Addresses } from "ipterate";

for (const ip of iterateIpV4Addresses({
  from: workerData.from,
  to: workerData.to,
})) {
  parentPort?.postMessage(ip);
}
