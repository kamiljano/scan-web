import { Store, ScannedSite, IterateUrlsProps } from './store';
import { Generated, Kysely } from 'kysely';

const ITERATION_BATCH_SIZE = 1000;

export interface SiteRecord {
  id: Generated<number>;
  url: string;
  lastUpdated: Generated<string>;
}

export interface ScanRecord {
  id: Generated<number>;
  siteId: number;
  checker: string;
  meta: Record<string, boolean | string | number | string[]>;
}

export interface Db {
  sites: SiteRecord;
  scans: ScanRecord;
}

export default abstract class KyselyStore implements Store {
  abstract initConnection(): void | Promise<void>;

  abstract initSchema(): void | Promise<void>;

  async init() {
    await this.initConnection();

    await this.initSchema();
  }

  abstract get db(): Kysely<Db>;

  abstract insertScan(val: ScannedSite): Promise<void>;

  async insertUrls(url: string[]) {
    await this.db
      .insertInto('sites')
      .values(url.map((u) => ({ url: u })))
      .onConflict((cb) => cb.column('url').doNothing())
      .execute();
  }

  async countRecords() {
    const result = await this.db
      .selectFrom('sites')
      .select((cb) => [cb.fn.countAll().as('total')])
      .executeTakeFirstOrThrow();

    return result.total as number;
  }

  async *iterateUrls(props?: IterateUrlsProps) {
    let lastResult: { id: number; url: string }[] = [];
    const skip = props?.skip ?? 0;
    let read = 0;

    const getLimit = () => {
      if (typeof props?.read === 'undefined') {
        return ITERATION_BATCH_SIZE;
      }
      if (ITERATION_BATCH_SIZE > props.read + read) {
        return props.read - read;
      }
      return ITERATION_BATCH_SIZE;
    };

    do {
      const result = await this.db
        .selectFrom('sites')
        .select(['id', 'url'])
        .orderBy('id', 'asc')
        .offset(skip + read)
        .limit(getLimit())
        .execute();

      read += result.length;

      for (const row of result) {
        yield row.url;
      }
      lastResult = result;
    } while (
      lastResult.length === ITERATION_BATCH_SIZE &&
      (!props?.read || read < props.read)
    );
  }

  listDomains() {
    return this.db.selectFrom('sites').select(['id', 'url']).execute();
  }

  async listScanResults() {
    const result = await this.db
      .selectFrom('scans')
      .leftJoin('sites', 'scans.siteId', 'sites.id')
      .select(['sites.id', 'sites.url', 'scans.meta', 'scans.checker'])
      .execute();

    return result.map((row) => ({
      ...row,
      meta:
        typeof row.meta === 'object'
          ? row.meta
          : JSON.parse(row.meta as unknown as string),
    }));
  }

  async clear() {
    await this.db.deleteFrom('sites').execute();
  }
}
