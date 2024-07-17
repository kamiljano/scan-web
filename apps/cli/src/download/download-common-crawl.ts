import * as path from "node:path";
import * as fs from "node:fs";
import { pipeline } from "node:stream/promises";
import { withCcDataStream } from "../utils/with-cc-domain-stream";

interface DownloadCommonCrawlProps {
  dataset: string;
  output: string;
}

export default async function downloadCommonCrawl(
  props: DownloadCommonCrawlProps,
) {
  const outputDir = path.resolve(props.output);
  if (fs.existsSync(outputDir)) {
    fs.unlinkSync(outputDir);
  }
  fs.mkdirSync(outputDir, { recursive: true });

  let totalFiles = 0;
  let processed = 0;

  await withCcDataStream(props.dataset, {
    onCalculatedTotal(total) {
      totalFiles = total;
    },
    async onFileStream(filePath, stream) {
      const fileName = path.basename(filePath);
      try {
        await pipeline(
          stream,
          fs.createWriteStream(path.join(outputDir, fileName)),
        );
      } finally {
        processed++;
        console.log(`Processed ${processed} out of ${totalFiles}`);
      }
    },
  });

  console.log("Done");
}
