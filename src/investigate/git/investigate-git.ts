import { setTimeout } from "node:timers/promises";
import { load } from "cheerio";
import path from "node:path";
import Queue from "promise-queue";
import * as fs from "node:fs";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";
import { waitForEmptyQueue } from "../../utils/queue-utils";
import investigateProject from "../investigate-project/investigate-project";
import printInvestigationReport from "../investigate-project/print-investigation-report";

interface GitInvestigationProps {
  dotGitUrl: string;
  tempDir: string;
}

const reqHtml = async (url: string) => {
  const controller = new AbortController();
  setTimeout(2000).then(() => controller.abort());

  const response = await fetch(url, { signal: controller.signal });
  const html = await response.text();
  return load(html);
};

// @ts-ignore
async function* listFiles(gitRoot: string) {
  const $ = await reqHtml(gitRoot);

  const links = $("a[href]").toArray();

  for (const link of links) {
    const linkElement = $(link);
    const href = linkElement.attr("href");
    const text = linkElement.text();

    if (
      href &&
      !href.startsWith("?") &&
      href !== "/" &&
      !text.toLowerCase().includes("parent")
    ) {
      const fullPath = path.join(gitRoot, href).replace(":/", "://");

      if (href.endsWith("/")) {
        yield* listFiles(fullPath);
      } else {
        yield fullPath;
      }
    }
  }
}

const downloadFile = async (
  props: Pick<GitInvestigationProps, "dotGitUrl" | "tempDir">,
  file: string,
) => {
  console.log(`Downloading file ${file}`);
  const controller = new AbortController();
  setTimeout(300000).then(() => controller.abort());

  const response = await fetch(file, { signal: controller.signal });

  const filePath = path.resolve(
    props.tempDir,
    file.replace(props.dotGitUrl, "").replace(/^\//, ""),
  );

  try {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  } catch (err) {
    //noop
  }

  try {
    const fileStream = fs.createWriteStream(filePath);

    await pipeline(response.body!, fileStream);
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const downloadGitRepo = async (props: GitInvestigationProps) => {
  const queue = new Queue(10);

  const dotGitPath = path.resolve(
    props.tempDir,
    props.dotGitUrl.replace(/\/.git$/, "").replace(/[:/]+/g, "_"),
    ".git",
  );

  await fs.promises.mkdir(dotGitPath, { recursive: true });

  const downloadProps = {
    dotGitUrl: props.dotGitUrl,
    tempDir: dotGitPath,
  };

  for await (const file of listFiles(props.dotGitUrl)) {
    queue.add(async () => downloadFile(downloadProps, file));
  }

  await waitForEmptyQueue(queue);

  const projectDir = path.dirname(dotGitPath);
  spawnSync("git", ["reset", "--hard", "HEAD"], {
    cwd: projectDir,
  });

  return projectDir;
};

export default async function investigateGit(props: GitInvestigationProps) {
  const projectDir = await downloadGitRepo(props);

  const report = await investigateProject(projectDir);
  printInvestigationReport(report);
  return report;
}
