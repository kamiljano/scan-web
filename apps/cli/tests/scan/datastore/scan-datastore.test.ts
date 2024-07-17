import { describe, test, expect } from 'vitest';
import scanDatastore from '../../../src/scan/datastore/scan-datastore';
import SqliteStore from '../../../src/store/sqlite-store';
import { git } from '../../../src/scan/checkers/git/git';

describe('scan-datastore', () => {
  test('Scans the domains from the datastore', async () => {
    const store = new SqliteStore(':memory:');
    await store.init();
    await store.insertUrls(['http://myfastquote.com']);

    await scanDatastore({
      store,
      verbose: false,
      checks: {
        '.git/HEAD': [git],
      },
    });

    const result = await store.listScanResults();

    expect(result).toEqual([
      {
        id: 1,
        url: 'http://myfastquote.com',
        checker: 'git',
        meta: {
          url: 'http://myfastquote.com/.git/HEAD',
          directoryExposed: true,
          gitRepo: 'git@github.com:LeadVision-Media/myfastquote.git',
          cloneable: false,
        },
      },
    ]);
  });
});
