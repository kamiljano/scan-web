type KnownSite = string;

interface ScannedSite {
  source: string;
  url: string;
  meta: Record<string, boolean | string | number | string[]>;
}

export type StoreValue = KnownSite | ScannedSite;

export interface Store {
  init?(): void | Promise<void>;
  store(val: StoreValue): void | Promise<void>;
  countRecords(): number | Promise<number>;
  iterateUrls(): AsyncGenerator<string, void>;
}
