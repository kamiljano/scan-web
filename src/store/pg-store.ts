import { Pool, types } from 'pg';
import { Kysely, PostgresDialect, sql } from 'kysely';
import KyselyStore, { Db } from './kysely-store';
import { StoreValue } from './store';

types.setTypeParser(types.builtins.INT8, (val) => parseInt(val, 10));
types.setTypeParser(types.builtins.INT2, (val) => parseInt(val, 10));
types.setTypeParser(types.builtins.INT4, (val) => parseInt(val, 10));
types.setTypeParser(types.builtins.NUMERIC, (val) => Number(val));

export default class PgStore extends KyselyStore {
  #db: Kysely<Db> | undefined;
  private readonly connectionString: string;

  constructor(connectionString: string) {
    super();

    this.connectionString = connectionString.startsWith('postgresql://')
      ? connectionString
      : `postgresql://${connectionString}`;
  }

  initConnection() {
    const dialect = new PostgresDialect({
      pool: new Pool({
        connectionString: this.connectionString,
        max: 10,
      }),
    });

    this.#db = new Kysely<Db>({
      dialect,
    });
  }

  async initSchema() {
    await this.db.schema
      .createTable('sites')
      .ifNotExists()
      .addColumn('id', 'bigserial', (cb) => cb.primaryKey().notNull())
      .addColumn('url', 'text', (cb) => cb.notNull())
      .addColumn('meta', 'json', (cb) => cb.notNull().defaultTo('{}'))
      .addUniqueConstraint('uniqueUrl', ['url'])
      .execute();
  }

  get db() {
    if (!this.#db) {
      throw new Error('Database is not initialized');
    }

    return this.#db;
  }

  async store(val: StoreValue) {
    if (typeof val === 'string') {
      await this.db
        .insertInto('sites')
        .values({ url: val, meta: sql`'{}'::json` })
        .onConflict((cb) => cb.column('url').doNothing())
        .execute();
      return;
    }
    const meta = JSON.stringify({
      [val.source]: val.meta,
    });
    await this.db
      .insertInto('sites')
      .values({
        url: val.url,
        meta: sql`${meta}::json`,
      })
      .onConflict((cb) =>
        cb.column('url').doUpdateSet({
          meta: sql`(sites.meta::jsonb || ${meta}::jsonb)::json`,
        }),
      )
      .execute();
  }
}
