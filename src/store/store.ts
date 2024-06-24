export interface StoreValue {
  source: string;
  url: string;
  meta: Record<string, string | number | string[]>;
}

export interface Store {
  init?(): void | Promise<void>;
  store(val: StoreValue): void | Promise<void>;
}
