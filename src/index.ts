import "source-map-support/register";
import yargs from "yargs";
import { CheckerMap, checkerMap } from "./scan/checkers";
import ipScan from "./scan/scan-ips/ip-scan";
import { stores } from "./store";
import ccScan from "./scan/common-crawl/cc-scan";
import investigateGit from "./investigate/git/investigate-git";
import getCommonCrawlOptions from "./scan/common-crawl/cc-crawl-options";
import importCommonCrawl from "./import/import-common-crawl";
import { Store } from "./store/store";
import scanDatastore from "./scan/datastore/scan-datastore";
import * as fs from "node:fs";
import investigateProjectCli from "./investigate/investigate-project/investigate-project-cli";

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

const getStore = async (storeConfig: string) => {
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
};

const storeOption: yargs.Options = {
  alias: "s",
  describe: "The store to use for storing the results",
  default: "sqlite://./db.sqlite",
  coerce(val: string | string[]): Promise<Store[]> {
    const storeConfigs = Array.isArray(val) ? val : [val];

    return Promise.all(storeConfigs.map(getStore));
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

const generateInvestigation = (args: yargs.Argv<{}>) => {
  return args
    .command(
      "git",
      "Retrieves the git repositories found during the scan operation and builds a report",
      (gitArgs) => {
        return gitArgs.options({
          dotGitUrl: {
            alias: "g",
            describe: "The URL of the .git directory to investigate",
            type: "string",
            demandOption: true,
            array: false,
          },
          tempDir: {
            alias: "t",
            describe: "The temporary directory to store the downloaded files",
            default: "./temp",
            array: false,
          },
        });
      },
      async (gitArgs) => {
        await investigateGit({
          dotGitUrl: gitArgs.dotGitUrl,
          tempDir: gitArgs.tempDir,
        });
      },
    )
    .command(
      "local",
      "Investigate a project in a local directory",
      (localArgs) => {
        return localArgs.options({
          path: {
            alias: "p",
            describe: "The path to the project directory to investigate",
            demandOption: true,
            array: false,
            coerce(path: string) {
              if (Array.isArray(path)) {
                throw new Error("Only one path can be specified");
              }

              if (!fs.existsSync(path)) {
                throw new Error(`The path ${path} does not exist`);
              }

              if (!fs.statSync(path).isDirectory()) {
                throw new Error(
                  `The path ${path} does not point to a project directory`,
                );
              }

              return path;
            },
          },
        });
      },
      async (args) => {
        await investigateProjectCli(args.path);
      },
    )
    .strict()
    .demandCommand();
};

const generateDataStoreScanCommand = (
  args: ReturnType<typeof generateCommonScanOptions>,
) => {
  return args.command(
    "datastore",
    "Scans the data store to acquire the initial list of URLs to check and updates it with the findings",
    (dbArgs) => {
      return dbArgs.options({
        store: {
          ...storeOption,
          description:
            "A single data store that will be used to acquire the initial list of URLs to check and update it with the findings",
          coerce(val: string | string[]): Promise<Store> {
            if (Array.isArray(val)) {
              throw new Error("Only one store can be specified");
            }
            return getStore(val);
          },
        },
      });
    },
    async (dbArgs) => {
      await scanDatastore({
        store: ((await dbArgs.store) ?? []) as Store,
        checks: toCheckerMap(dbArgs.check),
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
    let result = generateIpv4ScanCommand(generateCommonScanOptions(args));
    result = generateCommonCrawlScanCommand(result);
    result = generateDataStoreScanCommand(result);
    return result.strict().demandCommand();
  })
  .command("import", "Imports domains for scanning", (args) =>
    generateImportDomains(args).strict().demandCommand(),
  )
  .command(
    "investigate",
    "Runs investigations on specific patterns that have been discovered during the scan",
    generateInvestigation,
  )
  .strict()
  .demandCommand()
  .parseAsync()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
