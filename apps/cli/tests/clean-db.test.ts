import { describe, expect, test } from 'vitest';
import SqliteStore from '../src/store/sqlite-store';
import cleanDb from '../src/clean-db';

describe('cleanDb', () => {
  test('delete only invalid sites', async () => {
    const store = SqliteStore.inMemory();
    await store.init();
    await store.insertUrls([
      'https://google.com',
      'https://completely-made-up-domain.asdfadfadf.com',
    ]);

    await cleanDb({
      store,
    });

    const remainingDomains = await store.listDomains();
    expect(remainingDomains).toEqual([
      {
        id: 1,
        url: 'https://google.com',
      },
    ]);
  });
});
