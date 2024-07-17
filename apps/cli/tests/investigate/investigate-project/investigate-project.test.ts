import { describe, test, expect } from "vitest";
import { resolve } from "node:path";
import investigateProject from "../../../src/investigate/investigate-project/investigate-project";

describe("investigateProject", () => {
  test("When the project does not contain anything of value, should return an empty report", async () => {
    const report = await investigateProject(
      resolve(__dirname, "investigation-projects", "node", "boring"),
    );

    expect(report).toEqual({
      languages: ["typescript", "javascript"],
      files: [
        "/boring-file1.ts",
        "/boring-file2.ts",
        "/sub-dir/boring-file3.ts",
        "/sub-dir/file.js",
      ],
      findings: {},
    });
  });

  test("When the TS project contains passwords, mention it in the report", async () => {
    const report = await investigateProject(
      resolve(__dirname, "investigation-projects", "node", "with-passwords"),
    );

    expect(report).toEqual({
      languages: ["typescript"],
      files: ["/pwd-index.ts"],
      findings: {
        "/pwd-index.ts": [
          {
            context:
              '//some random text before the password\nconst passwordForVeryImportantThing = "aaaaaaaaaaaaaaaaa";\n//some random text after the password\n\n//my\n//awesome\n',
            from: 45,
            to: 79,
          },
          {
            context:
              'y\n//awesome\n//configuration\n//object\nconst config = {\n  secret: "bbbbbbbbbbbbbbbb",\n};\n\n// some secret\n// that needs to be\n',
            from: 55,
            to: 65,
          },
          {
            context:
              '\n\n// some secret\n// that needs to be\n// extracted\n// multiline\nconst aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaSecretThatDoesntFitIntoASingleLine =\n  "ssssssssssssss";\n',
            from: 68,
            to: 196,
          },
        ],
      },
    });
  });
});
