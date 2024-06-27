import * as fs from "node:fs/promises";
import { FileInvestigationReport } from "./investigation-report";

const secretIndicators = [
  "password",
  "secret",
  "key",
  "pwd",
  "token",
  "auth",
  "credentials",
  "creds",
  "pwd",
];

const CONTEXT_MARGIN_LINES = 5;

const findIndexNLinesAbove = (body: string, index: number, n: number) => {
  let linesFound = 0;
  let i = index;
  for (; i >= 0 && linesFound < n; i--) {
    if (body[i] === "\n") {
      linesFound++;
    }
  }

  return i;
};

const findIndexNLinesBelow = (body: string, index: number, n: number) => {
  let linesFound = 0;
  let i = index;
  for (; i < body.length && linesFound < n; i++) {
    if (body[i] === "\n") {
      linesFound++;
    }
  }

  return i;
};

const getSecretContext = (
  body: string,
  match: string,
): FileInvestigationReport => {
  const index = body.indexOf(match);
  const indexNLinesAbove = findIndexNLinesAbove(
    body,
    index,
    CONTEXT_MARGIN_LINES,
  );

  const indexNLinesBelow = findIndexNLinesBelow(
    body,
    index,
    CONTEXT_MARGIN_LINES,
  );

  return {
    context: body.substring(indexNLinesAbove, indexNLinesBelow),
    from: index - indexNLinesAbove - 1,
    to: index + match.length - indexNLinesAbove,
  };
};

export default async function investigateFile(
  file: string,
): Promise<FileInvestigationReport[]> {
  const body = await fs.readFile(file, "utf-8");
  const secretLikeExpressions = secretIndicators
    .flatMap((indicator) =>
      body.match(new RegExp(`\\w*${indicator}\\w*\\s*:?=?\\s*['"]`, "ig")),
    )
    .filter((match) => match) as string[];

  return secretLikeExpressions.map((ex) => getSecretContext(body, ex));
}
