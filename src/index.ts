import yargs from "yargs";
import { CheckerMap, checkerMap } from "./checkers";
import scan from "./scan";
import { stores } from "./store";

const toCheckerMap = (value: string | string[]) => {
  const set = new Set(Array.isArray(value) ? value : [value]);

  return Object.entries(checkerMap).reduce((acc, [path, checks]) => {
    if (checks.some((c) => set.has(c.name))) {
      if (!acc[path]) {
        acc[path] = [];
      }
      acc[path].push(...checks.filter((c) => set.has(c.name)));
    }
    return acc;
  }, {} as CheckerMap);
};

const isIPv4 = (ip: string) => {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    throw new Error(`The value ${ip} is not a valid IPv4 address`);
  }
  for (const part of parts) {
    const val = parseInt(part, 10);
    if (isNaN(val) || val < 0 || val > 255) {
      throw new Error(`The value ${ip} is not a valid IPv4 address`);
    }
  }

  return ip;
};

const generateIpv4ScanCommand = (args: yargs.Argv<{}>) => {
  return args
    .command(
      "ipv4",
      "Scans all IPv4 addresses (unless otherwise specified in search of requested patterns",
      (ipScanArgs) => {
        return ipScanArgs.options({
          from: {
            alias: "f",
            type: "string",
            describe: "The starting IP address",
            default: "0.0.0.0",
            coerce: isIPv4,
            configuration: {
              "duplicate-arguments-array": false,
            },
            array: false,
          },
          to: {
            alias: "t",
            type: "string",
            describe: "The last IP address to check",
            default: "255.255.255.255",
            configuration: {
              "duplicate-arguments-array": false,
            },
            coerce: isIPv4,
            array: false,
          },
          check: {
            alias: "c",
            describe:
              "Specific checks to be executed. If not defined, all checks will be executed... it might take a while...",
            choices: Object.values(checkerMap)
              .flat()
              .map((c) => c.name),
            default: Object.values(checkerMap)
              .flat()
              .map((c) => c.name),
          },
          store: {
            alias: "s",
            describe: "The store to use for storing the results",
            default: "sqlite://./db.sqlite",
            coerce(val: string | string[]) {
              const storeConfigs = Array.isArray(val) ? val : [val];

              return Promise.all(
                storeConfigs.map(async (storeConfig) => {
                  const [storeName, param] = storeConfig.split("://");
                  const storeCreator = stores[storeName];

                  if (!storeCreator) {
                    throw new Error(`The store ${storeName} is not available`);
                  }

                  const store = storeCreator(param);

                  if (store.init) {
                    await store.init();
                  }

                  return store;
                }),
              );
            },
          },
        });
      },
      async (ipScanArgs) => {
        return scan({
          from: ipScanArgs.from,
          to: ipScanArgs.to,
          checks: toCheckerMap(ipScanArgs.check),
          stores: (await ipScanArgs.store) ?? [],
        });
      },
    )
    .strict()
    .demandCommand();
};

yargs(process.argv.slice(2))
  .command("scan", "Scans the internet for specific patterns", (args) => {
    return generateIpv4ScanCommand(args);
  })
  .strict()
  .demandCommand()
  .parseAsync()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
