import {
  describe,
  vi,
  test,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  Mock,
  expect,
} from "vitest";
import { request } from "../src/check-ip";
import { CheckerMap, checkerMap } from "../src/checkers";
import { CheckerValidation } from "../src/checkers/checker";

const originalCheckerMap = { ...checkerMap };

const setCheckerMap = (map: CheckerMap) => {
  const keys = Object.keys(checkerMap);
  for (const key of keys) {
    delete checkerMap[key];
  }
  Object.assign(checkerMap, map);
};

const successChecker: CheckerValidation = async (ctx) => {
  return {
    success: true,
    meta: {
      url: ctx.url,
    },
  };
};

const failureChecker: CheckerValidation = async () => {
  return {
    success: false,
  };
};

describe("check-ip", () => {
  let fetch: Mock;

  beforeAll(() => {
    fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
  });

  beforeEach(() => {
    setCheckerMap({
      "": [failureChecker, successChecker],
    });

    fetch.mockImplementation(async (url: string) => {
      if (url.startsWith("http://")) {
        throw new Error("Unsupported protocol");
      }
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    });
  });

  afterEach(() => {
    fetch.mockClear();
  });

  afterAll(() => {
    fetch.mockRestore();
    setCheckerMap(originalCheckerMap);
  });

  test("should execute the requests and execute the checkers", async () => {
    const result = await request("127.0.0.1");

    expect(fetch).toHaveBeenCalledTimes(2);
    const fetchedUrls = fetch.mock.calls.map((call) => call[0]);
    expect(fetchedUrls).toContain("http://127.0.0.1/");
    expect(fetchedUrls).toContain("https://127.0.0.1/");

    expect(result).toEqual([
      {
        checker: "successChecker",
        meta: {
          url: "https://127.0.0.1/",
        },
      },
    ]);
  });
});
