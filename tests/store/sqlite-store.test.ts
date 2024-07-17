import { describe, test, beforeAll, expect, afterEach } from 'vitest';
import SqliteStore from '../../src/store/sqlite-store';

describe('sqlite-store', () => {
  const store = SqliteStore.inMemory();

  beforeAll(async () => {
    await store.init();
  });

  afterEach(async () => {
    await store.clear();
  });

  test('insertUrls', async () => {
    await store.insertUrls([
      'http://example.com',
      'http://example.com',
      'http://example2.com',
    ]);
    await store.insertUrls(['http://example.com']);

    const result = await store.listDomains();
    expect(result).toEqual([
      {
        id: expect.any(Number),
        url: 'http://example.com',
      },
      {
        id: expect.any(Number),
        url: 'http://example2.com',
      },
    ]);
  });

  test('iterateUrls', async () => {
    const promises: Promise<unknown>[] = [];
    for (let i = 0; i < 1100; i++) {
      promises.push(store.insertUrls([`http://example${i}.com`]));
    }
    await Promise.all(promises);

    let results = 0;
    for await (const url of store.iterateUrls()) {
      results++;
    }

    expect(results).toEqual(1100);
  });

  test('new record should be created', async () => {
    await store.insertScan({
      url: 'http://example.com',
      source: 'testSource',
      meta: {
        key: 'value',
      },
    });

    const result = await store.listScanResults();

    expect(result).toEqual([
      {
        id: expect.any(Number),
        url: 'http://example.com',
        checker: 'testSource',
        meta: {
          key: 'value',
        },
      },
    ]);
  });

  test('the old value should be updated', async () => {
    await store.insertScan({
      url: 'http://example.com',
      source: 'testSource',
      meta: {
        key: 'value',
      },
    });

    await store.insertScan({
      url: 'http://example.com',
      source: 'testSource',
      meta: {
        key: 'value2',
      },
    });

    const result = await store.listScanResults();

    expect(result).toEqual([
      {
        id: expect.any(Number),
        url: 'http://example.com',
        checker: 'testSource',
        meta: {
          key: 'value2',
        },
      },
    ]);
  });

  test('the record should be updated', async () => {
    await Promise.all([
      store.insertScan({
        url: 'http://example.com',
        source: 'testSource1',
        meta: {
          key: 'value1',
        },
      }),
      store.insertScan({
        url: 'http://example.com',
        source: 'testSource2',
        meta: {
          key: 'value2',
        },
      }),
    ]);

    const result = await store.listScanResults();

    expect(result).toEqual([
      {
        id: expect.any(Number),
        url: 'http://example.com',
        checker: 'testSource1',
        meta: {
          key: 'value1',
        },
      },
      {
        id: expect.any(Number),
        url: 'http://example.com',
        checker: 'testSource2',
        meta: {
          key: 'value2',
        },
      },
    ]);
  });
});
