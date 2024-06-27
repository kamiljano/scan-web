import { Store, StoreValue } from "./store";
import Database from "better-sqlite3";
import { Generated, Kysely, SqliteDialect, CamelCasePlugin, sql } from "kysely";
import * as path from "node:path";

interface SiteRecord {
  id: Generated<number>;
  url: string;
  meta: Record<string, Record<string, string>>;
}

interface Database {
  sites: SiteRecord;
}

const isRunningOnBun = () => !!process.versions.bun;

const getSqlDialect = async (filePath: string) => {
  if (isRunningOnBun()) {
    const [bunSqlite, bunKysely] = await Promise.all([
      import("bun:sqlite"),
      import("kysely-bun-sqlite"),
    ]);

    const bunDb = new bunSqlite.Database(filePath);

    return new bunKysely.default.BunSqliteDialect({ database: bunDb });
  }

  return new SqliteDialect({ database: new Database(filePath) });
};

export default class SqliteStore implements Store {
  #db: Kysely<Database> | undefined;

  constructor(private readonly filePath: string) {}

  async init() {
    this.#db = new Kysely<Database>({
      dialect: await getSqlDialect(this.filePath),
      plugins: [new CamelCasePlugin()],
    });

    await this.#db.schema
      .createTable("sites")
      .ifNotExists()
      .addColumn("id", "integer", (cb) =>
        cb.primaryKey().autoIncrement().notNull(),
      )
      .addColumn("url", "text", (cb) => cb.notNull())
      .addColumn("meta", "json", (cb) => cb.notNull().defaultTo("{}"))
      .addUniqueConstraint("uniqueUrl", ["url"])
      .execute();

    console.log(`SQLite DB initialized at ${path.resolve(this.filePath)}`);
  }

  get db() {
    if (!this.#db) {
      throw new Error("Database is not initialized");
    }

    return this.#db;
  }

  async store(val: StoreValue) {
    if (typeof val === "string") {
      await this.db
        .insertInto("sites")
        .values({ url: val, meta: sql`json('{}')` })
        .onConflict((cb) => cb.column("url").doNothing())
        .execute();
      return;
    }
    const meta = JSON.stringify({
      [val.source]: val.meta,
    });
    await this.db
      .insertInto("sites")
      .values({
        url: val.url,
        meta: sql`json(${meta})`,
      })
      .onConflict((cb) =>
        cb.column("url").doUpdateSet({
          meta: sql`json_patch(meta, ${meta})`,
        }),
      )
      .execute();
  }

  async list() {
    const result = await this.db.selectFrom("sites").selectAll().execute();

    return result.map((r) => ({
      ...r,
      meta: JSON.parse(r.meta as unknown as string),
    }));
  }

  async clear() {
    await this.db.deleteFrom("sites").execute();
  }
}
