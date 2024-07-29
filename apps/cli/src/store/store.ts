import { Selectable } from 'kysely';
import { SiteRecord } from './kysely-store';

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
  countSites(): number | Promise<number>;
  iterateUrls(props?: IterateUrlsProps): AsyncGenerator<string, void>;
  getSites(fromId?: number): Promise<Selectable<SiteRecord>[]>;
  deleteSites(ids: number[]): Promise<void>;
}
