import { afterAll, beforeAll, describe, expect, test } from "vitest";
import investigateGit from "../../../src/investigate/git/investigate-git";
import { resolve } from "node:path";
import * as fs from "node:fs";

describe("investigateGit", () => {
  const tempDir = resolve(__dirname, "git-test-temp-dir");

  const deleteTempDir = () => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  };

  beforeAll(() => {
    deleteTempDir();
  });

  afterAll(() => {
    deleteTempDir();
  });

  test("should produce investigation report for http://myfastquote.com/.git", async () => {
    await expect(
      investigateGit({
        dotGitUrl: "http://myfastquote.com/.git",
        tempDir,
      }),
    ).resolves.not.toThrow();
  }, 120000);
});
