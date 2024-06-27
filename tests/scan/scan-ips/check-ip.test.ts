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
import { request } from "../../../src/scan/scan-ips/check-ip";
import { CheckerValidation } from "../../../src/scan/checkers/checker";

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
  describe("with real request", () => {
    test("should execute the requests and execute the checkers", async () => {
      const result = await request("google.com", {
        "": [failureChecker, successChecker],
      });

      expect(result).toEqual([
        {
          checker: "successChecker",
          meta: {
            url: "http://google.com/",
          },
        },
        {
          checker: "successChecker",
          meta: {
            url: "https://google.com/",
          },
        },
      ]);
    });
  });

  describe("with mock request", () => {
    let fetch: Mock;

    beforeAll(() => {
      fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
    });

    beforeEach(() => {
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
    });

    test("should execute the requests and execute the checkers", async () => {
      const result = await request("127.0.0.1", {
        "": [failureChecker, successChecker],
      });

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
});
