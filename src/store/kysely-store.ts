import { Store, StoreValue } from './store';
import { Generated, Kysely } from 'kysely';

const ITERATION_BATCH_SIZE = 1000;

export interface SiteRecord {
  id: Generated<number>;
  url: string;
  meta: Record<string, Record<string, string>>;
}

export interface Db {
  sites: SiteRecord;
}

export default abstract class KyselyStore implements Store {
  abstract initConnection(): void | Promise<void>;

  abstract initSchema(): void | Promise<void>;

  async init() {
    await this.initConnection();

    await this.initSchema();
  }
  abstract get db(): Kysely<Db>;

  abstract store(val: StoreValue): Promise<void>;

  async countRecords() {
    const result = await this.db
      .selectFrom('sites')
      .select((cb) => [cb.fn.countAll().as('total')])
      .executeTakeFirstOrThrow();

    return result.total as number;
  }

  async *iterateUrls() {
    let lastResult: { id: number; url: string }[] = [];
    do {
      let query = this.db
        .selectFrom('sites')
        .select(['id', 'url'])
        .orderBy('id', 'asc')
        .limit(ITERATION_BATCH_SIZE);
      if (lastResult.length) {
        query = query.where('id', '>', lastResult[lastResult.length - 1].id);
      }
      const result = await query.execute();
      for (const row of result) {
        yield row.url;
      }
      lastResult = result;
    } while (lastResult.length === ITERATION_BATCH_SIZE);
  }

  async list() {
    const result = await this.db.selectFrom('sites').selectAll().execute();

    return result.map((r) => ({
      ...r,
      meta: typeof r.meta === 'string' ? JSON.parse(r.meta) : r.meta,
    }));
  }

  async clear() {
    await this.db.deleteFrom('sites').execute();
  }
}
