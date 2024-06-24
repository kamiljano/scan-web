import { Store, StoreValue } from "./store";
import Database from "better-sqlite3";
import * as fs from "node:fs";
import { Generated, Kysely, SqliteDialect, CamelCasePlugin, sql } from "kysely";

interface SiteRecord {
  id: Generated<number>;
  url: string;
  meta: Record<string, Record<string, string>>;
}

interface Database {
  sites: SiteRecord;
}

export default class SqliteStore implements Store {
  private readonly db: Kysely<Database>;

  constructor(filePath: string) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const database = new Database(filePath);

    this.db = new Kysely<Database>({
      dialect: new SqliteDialect({ database }),
      plugins: [new CamelCasePlugin()],
    });
  }

  async init() {
    await this.db.schema
      .createTable("sites")
      .addColumn("id", "integer", (cb) =>
        cb.primaryKey().autoIncrement().notNull(),
      )
      .addColumn("url", "text", (cb) => cb.notNull())
      .addColumn("meta", "json", (cb) => cb.notNull().defaultTo("{}"))
      .addUniqueConstraint("uniqueUrl", ["url"])
      .execute();
  }

  async store(val: StoreValue) {
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
