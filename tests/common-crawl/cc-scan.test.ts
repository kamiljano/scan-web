import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  Mock,
  test,
  vi,
} from "vitest";
import { CheckerValidation } from "../../src/checkers/checker";
import { checkUrl } from "../../src/common-crawl/cc-scan";

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

describe("cc-scan", () => {
  let fetch: Mock;

  beforeAll(() => {
    fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
  });

  afterEach(() => {
    fetch.mockClear();
  });

  afterAll(() => {
    fetch.mockRestore();
  });

  describe("checkUrl", () => {
    beforeEach(() => {
      fetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0),
      });
    });

    test("should return successful checks", async () => {
      const result = await checkUrl("http://example.com", {
        checks: {
          "": [failureChecker, successChecker],
        },
        stores: [],
      });

      expect(result).toEqual([
        {
          checker: "successChecker",
          meta: {
            url: "http://example.com/",
          },
        },
      ]);
    });
  });
});
