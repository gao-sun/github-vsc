import { readBlob, readEntries } from './apis';
import {
  cachedEntries,
  cachedEntriesPromise,
  cachedData,
  cachedDataPromise,
  dirtyData,
} from './store';
import { EntryMap, GitHubLocation } from './types';

export const get = async <T>(
  key: string,
  fetch: () => Promise<T>,
  cachedDict: Dictionary<string, T>,
  cachedPromiseDict: Dictionary<string, Promise<T>>,
  dirtyDict?: Dictionary<string, T>,
): Promise<T> => {
  const dirty = dirtyDict?.[key];
  if (dirty) {
    return dirty;
  }

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
  get(sha, () => readBlob(location, sha), cachedData, cachedDataPromise, dirtyData);

export const isDataDirty = (sha: string): boolean =>
  Object.prototype.hasOwnProperty.call(dirtyData, sha);
