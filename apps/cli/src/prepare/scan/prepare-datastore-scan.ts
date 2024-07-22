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

  const result: { name: string; skip: number; read: number }[] = [];

  for (let i = 0; i < props.splitIntoBatches && i * diff < count; i++) {
    result.push({
      name: `batch-${i}`,
      skip: i * diff,
      read: diff,
    });
  }

  console.log(JSON.stringify(result, null, 2));
}
