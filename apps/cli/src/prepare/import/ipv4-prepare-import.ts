import { toIPv4 } from 'toip';

interface PrepareIpImportProps {
  splitIntoBatches: number;
}

const NUM_OF_IPS = 4294967296;

export default function prepareIpImport(props: PrepareIpImportProps) {
  const result: { name: string; from: string; to: string }[] = [];

  for (let i = 0; i < props.splitIntoBatches; i++) {
    const from = Math.floor((i * NUM_OF_IPS) / props.splitIntoBatches);
    const to = Math.floor(((i + 1) * NUM_OF_IPS) / props.splitIntoBatches) - 1;

    result.push({
      name: `batch-${i}`,
      from: toIPv4(from),
      to: toIPv4(to),
    });
  }

  console.log(JSON.stringify(result, null, 2));
}
