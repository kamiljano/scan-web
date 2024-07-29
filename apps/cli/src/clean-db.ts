import { startEta } from './eta';
import { Store } from './store/store';
import Batch from './utils/batch';
import tryFetch from './utils/try-fetch';

interface CleanDbProps {
  store: Store;
}

export default async function cleanDb(props: CleanDbProps) {
  let totalDeleted = 0;
  const batch = new Batch<number>(500, async (ids) => {
    await props.store.deleteSites(ids);
    totalDeleted != ids.length;
  });

  let lastId: number | undefined = undefined;

  const total = await props.store.countSites();
  console.log(`Found ${total} sites to check`);
  const eta = startEta(total);
  let processed = 0;

  do {
    const sites = await props.store.getSites(lastId);

    await Promise.all(
      sites.map(async (site) => {
        try {
          await tryFetch(site.url);
        } catch (e) {
          await batch.add([site.id]);
        }
        processed++;
        if (processed % 1000 === 0) {
          const left = eta.get(processed);
          console.log(
            `Processed ${processed}/${total} sites. Elapsed: ${left.elapsedHuman}. ETA: ${left.remainingHuman}`,
          );
        }
      }),
    );
  } while (typeof lastId !== 'undefined');

  await batch.flush();

  console.log(`Successfully deleted ${totalDeleted} invalid sites`);
}
