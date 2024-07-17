import { describe, test, expect } from "vitest";
import isCloneable from "../../../../src/scan/checkers/git/is-cloneable";

describe("is-cloneable", () => {
  test("https://nickywan123@bitbucket.org", async () => {
    expect(await isCloneable("https://nickywan123@bitbucket.org")).toBe(false);
  }, 10_000);

  test("https://nickywan123@bitbucket.org/nickywan123/delhub-digital.git", async () => {
    expect(
      await isCloneable("https://bitbucket.org/nickywan123/delhub-digital.git"),
    ).toBe(false);
  }, 10_000);

  test("https://github.com/technext/Agency-2.git", async () => {
    expect(await isCloneable("https://github.com/technext/Agency-2.git")).toBe(
      true,
    );
  }, 10_000);
});
