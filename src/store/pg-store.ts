import { Pool, types } from 'pg';
import { CamelCasePlugin, Kysely, PostgresDialect, sql } from 'kysely';
import KyselyStore, { Db } from './kysely-store';
import { ScannedSite } from './store';

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
      plugins: [new CamelCasePlugin()],
    });
  }

  async initSchema() {
    await this.db.schema
      .createTable('sites')
      .ifNotExists()
      .addColumn('id', 'bigserial', (cb) => cb.primaryKey().notNull())
      .addColumn('url', 'text', (cb) => cb.notNull())
      .addColumn('lastUpdated', 'timestamp', (cb) => cb.defaultTo('now()'))
      .addUniqueConstraint('uniqueUrl', ['url'])
      .execute();

    await this.db.schema
      .createTable('scans')
      .ifNotExists()
      .addColumn('id', 'bigserial', (cb) => cb.primaryKey().notNull())
      .addColumn('siteId', 'bigint', (cb) =>
        cb.notNull().references('sites.id').onDelete('cascade'),
      )
      .addColumn('checker', 'text', (cb) => cb.notNull())
      .addColumn('meta', 'json', (cb) => cb.notNull())
      .addUniqueConstraint('uniqueScan', ['siteId', 'checker'])
      .execute();
  }

  get db() {
    if (!this.#db) {
      throw new Error('Database is not initialized');
    }

    return this.#db;
  }

  async insertScan(val: ScannedSite) {
    await this.db.transaction().execute(async (tx) => {
      const siteResult = await tx
        .insertInto('sites')
        .values({ url: val.url })
        .onConflict((cb) =>
          cb.column('url').doUpdateSet({ lastUpdated: sql`now()` }),
        )
        .returning('id')
        .execute();

      const meta = JSON.stringify(val.meta);

      await sql`
        insert into scans (site_id, checker, meta) values (
          ${siteResult[0].id},
          ${val.source},
          ${meta}::json
        ) on conflict(site_id, checker) do update set meta = (scans.meta::jsonb || ${meta}::jsonb)::json
      `.execute(tx);
    });
  }
}
