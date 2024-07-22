import {
  describe,
  test,
  beforeAll,
  expect,
  afterEach,
  beforeEach,
} from 'vitest';
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

  describe('iterateUrls', () => {
    beforeEach(async () => {
      const promises: Promise<unknown>[] = [];
      for (let i = 0; i < 1100; i++) {
        promises.push(store.insertUrls([`http://example${i}.com`]));
      }
      await Promise.all(promises);
    });

    test('no parameters', async () => {
      let results = 0;
      for await (const url of store.iterateUrls()) {
        results++;
      }

      expect(results).toEqual(1100);
    });

    test('skip', async () => {
      let urls: string[] = [];
      for await (const url of store.iterateUrls({
        skip: 3,
      })) {
        urls.push(url);
      }

      expect(urls.length).toEqual(1097);
      expect(urls[0]).toEqual('http://example3.com');
      expect(urls[1096]).toEqual('http://example1099.com');
    });

    test('read', async () => {
      let urls: string[] = [];
      for await (const url of store.iterateUrls({
        read: 3,
      })) {
        urls.push(url);
      }

      expect(urls).toEqual([
        'http://example0.com',
        'http://example1.com',
        'http://example2.com',
      ]);
    });

    test('skip & read', async () => {
      let urls: string[] = [];
      for await (const url of store.iterateUrls({
        skip: 3,
        read: 1000,
      })) {
        urls.push(url);
      }

      expect(urls.length).toEqual(1000);
      expect(urls[0]).toEqual('http://example3.com');
      expect(urls[999]).toEqual('http://example1002.com');
    });
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
