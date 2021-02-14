import { readBlob, readEntries } from './apis';
import { EntryMap, GitHubLocation } from './types';

const initCache = <T>(): [Dictionary<string, T>, Dictionary<string, Promise<T>>] => [{}, {}];

const [cachedEntries, cachedEntriesPromise] = initCache<EntryMap>();
const [cachedData, cachedDataPromise] = initCache<Uint8Array>();

export const get = async <T>(
  key: string,
  fetch: () => Promise<T>,
  cachedDict: Dictionary<string, T>,
  cachedPromiseDict: Dictionary<string, Promise<T>>,
): Promise<T> => {
  const cached = cachedDict[key];
  if (cached) {
    return cached;
  }

  const cachedPromise = cachedPromiseDict[key];
  if (cachedPromise) {
    return cachedPromise;
  }

  const promise = fetch();
  cachedPromiseDict[key] = promise;

  const data = await promise;
  cachedDict[key] = data;
  delete cachedPromiseDict[key];

  return data;
};

export const getEntries = (location: GitHubLocation, sha: string): Promise<EntryMap> => {
  return get(sha, () => readEntries(location), cachedEntries, cachedEntriesPromise);
};

export const getData = async (location: GitHubLocation, sha: string): Promise<Uint8Array> =>
  get(sha, () => readBlob(location, sha), cachedData, cachedDataPromise);
