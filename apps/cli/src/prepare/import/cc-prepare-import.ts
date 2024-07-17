import { listFiles } from '../../utils/with-cc-domain-stream';
import _ from 'lodash';
import fs from 'node:fs';

interface PrepareCommonCrawlImportProps {
  dataset: string;
  splitListEvery: number | undefined;
  output: string;
}

const writeFileDescriptor = async (output: string, files: string[][]) => {
  const result: { name: string; batchId: number }[] = [];

  for (let i = 0; i < files.length; i++) {
    result.push({
      name: `batch-${i}`,
      batchId: i,
    });
  }

  await fs.promises.writeFile(
    `describe-${output}`,
    JSON.stringify(result, null, 2),
    'utf-8',
  );

  console.log(JSON.stringify(result, null, 2));
};

export default async function prepareCcImport(
  props: PrepareCommonCrawlImportProps,
) {
  const files = await listFiles(props.dataset);

  if (props.splitListEvery) {
    const batched = _.chunk(files, props.splitListEvery);
    await Promise.all([
      fs.promises.writeFile(
        props.output,
        JSON.stringify(batched, null, 2),
        'utf-8',
      ),
      writeFileDescriptor(props.output, batched),
    ]);
  } else {
    fs.writeFileSync(props.output, JSON.stringify(files, null, 2), 'utf-8');
  }

  process.exit(0);
}
