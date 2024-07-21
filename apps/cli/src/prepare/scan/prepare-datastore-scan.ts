import { Store } from '../../store/store';

interface PrepareDatastoreScanProps {
  store: Store;
  splitIntoBatches: number;
}

export default async function prepareDatastoreScan(
  props: PrepareDatastoreScanProps,
) {
  const count = await props.store.countRecords();
  const diff = Math.ceil(count / props.splitIntoBatches);

  const result: { name: string; from: number; to: number }[] = [];

  for (let i = 0; i < props.splitIntoBatches && i * diff < count; i++) {
    result.push({
      name: `batch-${i}`,
      from: i * diff,
      to: Math.min((i + 1) * diff - 1, count),
    });
  }

  console.log(JSON.stringify(result, null, 2));
}
