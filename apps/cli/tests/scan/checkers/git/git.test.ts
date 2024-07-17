import { describe, test, expect } from "vitest";
import { git } from "../../../../src/scan/checkers/git/git";
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
      path.resolve(__dirname, "..", "..", "..", "..", ".git", "HEAD"),
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

  test("actual website with uploaded git - https://myfastquote.com", async () => {
    const result = await git({
      url: "https://myfastquote.com/.git/HEAD",
      body: new Uint8Array(Buffer.from("ref: refs/heads/master")),
    });

    expect(result).toEqual({
      success: true,
      meta: {
        url: "https://myfastquote.com/.git/HEAD",
        gitRepo: "git@github.com:LeadVision-Media/myfastquote.git",
        directoryExposed: true,
        cloneable: false,
      },
    });
  });

  test("actual website with uploaded git - https://buxtehude2007.de", async () => {
    const result = await git({
      url: "https://buxtehude2007.de/.git/HEAD",
      body: new Uint8Array(Buffer.from("ref: refs/heads/master")),
    });

    expect(result).toEqual({
      success: true,
      meta: {
        url: "https://buxtehude2007.de/.git/HEAD",
        directoryExposed: true,
        gitRepo: "https://github.com/technext/Agency-2.git",
        cloneable: true,
      },
    });
  });

  test("actual website with uploaded git - https://buxtehude2007.de", async () => {
    const result = await git({
      url: "https://buxtehude2007.de/.git/HEAD",
      body: new Uint8Array(Buffer.from("ref: refs/heads/master")),
    });

    expect(result).toEqual({
      success: true,
      meta: {
        url: "https://buxtehude2007.de/.git/HEAD",
        directoryExposed: true,
        gitRepo: "https://github.com/technext/Agency-2.git",
        cloneable: true,
      },
    });
  });
});
