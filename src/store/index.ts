import SqliteStore from './sqlite-store';
import PgStore from './pg-store';
import { Store } from './store';

type StoreMap = Record<string, (param: string) => Store>;

export const stores: StoreMap = {
  sqlite: (param) => new SqliteStore(param),
  postgresql: (param) => new PgStore(param),
};
