import { describe, test, beforeAll, expect, afterEach } from 'vitest';
import PgStore from '../../src/store/pg-store';

describe('pg-store', () => {
  const store = new PgStore('postgresql://postgres:password@localhost:5432');

  beforeAll(async () => {
    await store.init();
  });

  afterEach(async () => {
    await store.clear();
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
        checker: 'testSource',
        url: 'http://example.com',
        meta: {
          key: 'value2',
        },
      },
    ]);
  });
});
