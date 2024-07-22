export interface ScannedSite {
  source: string;
  url: string;
  meta: Record<string, boolean | string | number | string[]>;
}

export interface IterateUrlsProps {
  skip?: number;
  read?: number;
}

export interface Store {
  init?(): void | Promise<void>;
  insertScan(val: ScannedSite): void | Promise<void>;
  insertUrls(url: string[]): void | Promise<void>;
  countRecords(): number | Promise<number>;
  iterateUrls(props?: IterateUrlsProps): AsyncGenerator<string, void>;
}
