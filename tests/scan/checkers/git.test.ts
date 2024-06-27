import { describe, test, expect } from "vitest";
import { git } from "../../../src/scan/checkers/git";
import * as fs from "node:fs";
import * as path from "node:path";

describe("git-checker", () => {
  test("contains an empty buffer, therefore should fail", async () => {
    const result = await git({
      url: "http://127.0.0.1",
      body: new Uint8Array(),
    });

    expect(result).toEqual({
      success: false,
    });
  });

  test("contains a HEAD file, therefore should be succeed", async () => {
    const headFile = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "..", ".git", "HEAD"),
    );

    const result = await git({
      url: "http://127.0.0.1",
      body: new Uint8Array(headFile),
    });

    expect(result).toEqual({
      success: true,
      meta: {
        url: "http://127.0.0.1",
        directoryExposed: false,
      },
    });
  });

  test("returned some content that is not empty, but is not git data either, should fail", async () => {
    const result = await git({
      url: "http://127.0.0.1",
      body: new Uint8Array(Buffer.from("<html></html>")),
    });

    expect(result).toEqual({
      success: false,
    });
  });

  test("actual website with uploaded git", async () => {
    const result = await git({
      url: "https://myfastquote.com/.git/HEAD",
      body: new Uint8Array(Buffer.from("ref: refs/heads/master")),
    });

    expect(result).toEqual({
      success: true,
      meta: {
        url: "https://myfastquote.com/.git/HEAD",
        directoryExposed: true,
      },
    });
  });
});
