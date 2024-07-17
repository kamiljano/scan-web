import { Kysely, SqliteDialect, CamelCasePlugin, sql } from 'kysely';
import KyselyStore, { Db } from './kysely-store';
import { ScannedSite } from './store';

const isRunningOnBun = () => !!process.versions.bun;

const getSqlDialect = async (filePath: string) => {
  if (isRunningOnBun()) {
    const [bunSqlite, bunKysely] = await Promise.all([
      import('bun:sqlite'),
      import('kysely-bun-sqlite'),
    ]);

    const bunDb = new bunSqlite.Database(filePath);

    return new bunKysely.default.BunSqliteDialect({ database: bunDb });
  }

  const sqlite = await import('better-sqlite3');

  return new SqliteDialect({ database: new sqlite.default(filePath) });
};

export default class SqliteStore extends KyselyStore {
  #db: Kysely<Db> | undefined;

  static inMemory() {
    return new SqliteStore(':memory:');
  }

  constructor(private readonly filePath: string) {
    super();
  }

  async initConnection() {
    this.#db = new Kysely<Db>({
      dialect: await getSqlDialect(this.filePath),
      plugins: [new CamelCasePlugin()],
    });
  }

  async initSchema() {
    await this.db.schema
      .createTable('sites')
      .ifNotExists()
      .addColumn('id', 'integer', (cb) =>
        cb.primaryKey().autoIncrement().notNull(),
      )
      .addColumn('url', 'text', (cb) => cb.notNull())
      .addColumn('lastUpdated', 'timestamp', (cb) =>
        cb.defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addUniqueConstraint('uniqueUrl', ['url'])
      .execute();

    await this.db.schema
      .createTable('scans')
      .ifNotExists()
      .addColumn('id', 'integer', (cb) =>
        cb.primaryKey().autoIncrement().notNull(),
      )
      .addColumn('siteId', 'integer', (cb) =>
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
        .values([{ url: val.url }])
        .onConflict((cb) =>
          cb.column('url').doUpdateSet({ lastUpdated: sql`CURRENT_TIMESTAMP` }),
        )
        .returning('id')
        .execute();

      const meta = JSON.stringify(val.meta);
      await sql`
        insert into scans (site_id, checker, meta) values (
          ${siteResult[0].id},
          ${val.source},
          json(${meta})
        ) on conflict(site_id, checker) do update set meta = json_patch(scans.meta, ${meta})
      `.execute(tx);
    });
  }
}
