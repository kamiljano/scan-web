import { parentPort, Worker, workerData } from "worker_threads";
import { iterateIpV4Addresses } from "ipterate";

for (const ip of iterateIpV4Addresses({
  from: "0.0.0.0",
  to: "255.255.255.255",
})) {
  parentPort?.postMessage(ip);
}
