import { EntryMap } from './types';

const initCache = <T>(): [
  Dictionary<string, T>,
  Dictionary<string, Promise<T>>,
  Dictionary<string, T>,
] => [{}, {}, {}];

export const [cachedEntries, cachedEntriesPromise] = initCache<EntryMap>();
export const [cachedData, cachedDataPromise, dirtyData] = initCache<Uint8Array>();
