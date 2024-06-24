import { describe, test, beforeAll, expect, afterEach } from "vitest";
import SqliteStore from "../src/store/sqlite-store";

describe("sqlite-store", () => {
  const store = new SqliteStore(":memory:");

  beforeAll(async () => {
    await store.init();
  });

  afterEach(async () => {
    await store.clear();
  });

  test("new record should be created", async () => {
    await store.store({
      url: "http://example.com",
      source: "testSource",
      meta: {
        key: "value",
      },
    });

    const result = await store.list();

    expect(result).toEqual([
      {
        id: expect.any(Number),
        url: "http://example.com",
        meta: {
          testSource: {
            key: "value",
          },
        },
      },
    ]);
  });

  test("the record should be updated", async () => {
    await Promise.all([
      store.store({
        url: "http://example.com",
        source: "testSource1",
        meta: {
          key: "value",
        },
      }),
      store.store({
        url: "http://example.com",
        source: "testSource2",
        meta: {
          key: "value",
        },
      }),
    ]);

    const result = await store.list();

    expect(result).toEqual([
      {
        id: expect.any(Number),
        url: "http://example.com",
        meta: {
          testSource1: {
            key: "value",
          },
          testSource2: {
            key: "value",
          },
        },
      },
    ]);
  });
});
