import Database from 'better-sqlite3';
import { Kysely, SqliteDialect, CamelCasePlugin, sql } from 'kysely';
import KyselyStore, { Db } from './kysely-store';
import { StoreValue } from './store';

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

  return new SqliteDialect({ database: new Database(filePath) });
};

export default class SqliteStore extends KyselyStore {
  #db: Kysely<Db> | undefined;

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
        .values({ url: val, meta: sql`json('{}')` })
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
        meta: sql`json(${meta})`,
      })
      .onConflict((cb) =>
        cb.column('url').doUpdateSet({
          meta: sql`json_patch(meta, ${meta})`,
        }),
      )
      .execute();
  }
}
