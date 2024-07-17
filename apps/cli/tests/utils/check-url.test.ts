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
import { CheckerValidation } from "../../src/scan/checkers/checker";
import { checkUrl } from "../../src/utils/check-url";

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

describe("checkUrl", () => {
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

  beforeEach(() => {
    fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    });
  });

  test("should return successful checks", async () => {
    const result = await checkUrl("http://example.com", {
      "": [failureChecker, successChecker],
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
