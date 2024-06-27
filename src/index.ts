import yargs from "yargs";
import { CheckerMap, checkerMap } from "./checkers";
import ipScan from "./scan-ips/ip-scan";
import { stores } from "./store";
import getCommonCrawlOptions from "./common-crawl/cc-crawl-options";
import ccScan from "./common-crawl/cc-scan";
import importCommonCrawl from "./import/commoon-crawl";
import { Store } from "./store/store";

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

const storeOption: yargs.Options = {
  alias: "s",
  describe: "The store to use for storing the results",
  default: "sqlite://./db.sqlite",
  coerce(val: string | string[]): Promise<Store[]> {
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
};

const generateCommonScanOptions = (args: yargs.Argv<{}>) => {
  return args.options({
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
    store: storeOption,
  });
};

const generateIpv4ScanCommand = (
  args: ReturnType<typeof generateCommonScanOptions>,
) => {
  return args.command(
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
      });
    },
    async (ipScanArgs) => {
      return ipScan({
        from: ipScanArgs.from,
        to: ipScanArgs.to,
        checks: toCheckerMap(ipScanArgs.check),
        stores: ((await ipScanArgs.store) ?? []) as Store[],
      });
    },
  );
};

let ccOptions: Promise<string[]> | undefined;
const getCcOptions = () => {
  if (!ccOptions) ccOptions = getCommonCrawlOptions();
  return ccOptions;
};

const commonCrawlOptions = {
  async dataset() {
    return {
      alias: "d",
      choices: ["latest", ...(await getCcOptions())],
      demandOption: true,
      array: false,
      async coerce(val: string | string[]): Promise<string> {
        if (Array.isArray(val)) {
          throw new Error("Only one dataset can be specified");
        }

        if (val === "latest") {
          const options = await getCcOptions();
          return options[0];
        }

        return val;
      },
    };
  },
} satisfies Record<string, () => Promise<yargs.Options>>;

const generateCommonCrawlScanCommand = (
  args: ReturnType<typeof generateCommonScanOptions>,
) => {
  return args.command(
    "commoncrawl",
    "Scans the internet based on the domains specified in the Common Crawl data",
    async (ccArgs) => {
      return ccArgs.options({
        skip: {
          alias: "n",
          type: "number",
          describe:
            "The number of domains to skip. Useful when resuming a scan",
          default: 0,
          array: false,
        },
        dataset: await commonCrawlOptions.dataset(),
      });
    },
    async (ccArgs) => {
      return ccScan({
        dataset: await ccArgs.dataset,
        checks: toCheckerMap(ccArgs.check),
        stores: ((await ccArgs.store) ?? []) as Store[],
        skip: ccArgs.skip,
      });
    },
  );
};

const generateImportDomains = (args: yargs.Argv<{}>) => {
  return args.command(
    "commoncrawl",
    "Imports domains from the Common Crawl dataset and stores them in the datastore. Once provided as input, you can use the db scan command for faster performance than scanning the commoncrawl for instance",
    async (ccArgs) => {
      return ccArgs.options({
        dataset: await commonCrawlOptions.dataset(),
        stores: {
          ...storeOption,
          demandOption: true,
        },
      });
    },
    async (ccArgs) => {
      return importCommonCrawl({
        dataset: await ccArgs.dataset,
        stores: (await ccArgs.stores) as Store[],
      });
    },
  );
};

yargs(process.argv.slice(2))
  .command("scan", "Scans the internet for specific patterns", (args) => {
    const result = generateIpv4ScanCommand(generateCommonScanOptions(args));
    return generateCommonCrawlScanCommand(result).strict().demandCommand();
  })
  .command("import", "Imports domains for scanning", (args) =>
    generateImportDomains(args).strict().demandCommand(),
  )
  .strict()
  .demandCommand()
  .parseAsync()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
