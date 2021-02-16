import { FileSystemError } from 'vscode';
import { getData, getEntries, isDataDirtyWithoutFetching } from './getter';
import { Directory, Entry, EntryMap, File, GitHubLocation } from './types';

export type LookupOptions = {
  caseInsensitive?: boolean;
};

export const LOOKUP_ORIGINAL_KEY = 'original';

export const lookupEntry = async (
  root: Directory,
  { owner, repo, ref, uri }: GitHubLocation,
  options?: LookupOptions,
): Promise<File | Directory> => {
  const { caseInsensitive }: LookupOptions = { caseInsensitive: false, ...options };
  let entry: Entry = root;

  for (const segment of uri.path.split('/')) {
    if (!segment) {
      continue;
    }

    if (!(entry instanceof Directory)) {
      throw FileSystemError.FileNotFound(uri);
    }

    const entryMap = await getEntries({ owner, repo, ref, uri: entry.uri }, entry.sha);
    const child = !caseInsensitive
      ? entryMap.get(segment)
      : [...entryMap.entries()].find(([name]) => name.toLowerCase() === segment.toLowerCase())?.[1];

    if (!child) {
      throw FileSystemError.FileNotFound(uri);
    }

    entry = child;
  }

  console.log('lookup result', owner, repo, ref, uri.path, entry);

  if (entry instanceof File) {
    return entry;
  }

  if (entry instanceof Directory) {
    return entry;
  }

  throw FileSystemError.Unavailable(uri);
};

export const lookup = async (
  root: Directory,
  location: GitHubLocation,
  options?: LookupOptions,
): Promise<[File, Uint8Array] | [Directory, EntryMap]> => {
  const entry = await lookupEntry(root, location, options);

  if (entry instanceof File) {
    return [
      entry,
      await getData(location, entry.sha, location.uri.query.includes(LOOKUP_ORIGINAL_KEY)),
    ];
  }

  if (entry instanceof Directory) {
    return [entry, await getEntries(location, entry.sha)];
  }

  throw FileSystemError.Unavailable(location.uri);
};

export const lookupAsDirectory = async (
  root: Directory,
  location: GitHubLocation,
  options?: LookupOptions,
): Promise<[Directory, EntryMap]> => {
  const [directory, entries] = await lookup(root, location, options);

  if (!(directory instanceof Directory)) {
    throw FileSystemError.FileNotADirectory(location.uri);
  }

  return [directory, entries as EntryMap];
};

export const lookupAsDirectorySilently = async (
  root: Directory,
  location: GitHubLocation,
  options?: LookupOptions,
): Promise<[Optional<Directory>, EntryMap]> => {
  try {
    const [directory, entryMap] = await lookupAsDirectory(root, location, options);
    return [directory, entryMap];
  } catch {
    // ignored
  }
  return [, new Map()];
};

export const lookupAsFile = async (
  root: Directory,
  location: GitHubLocation,
  options?: LookupOptions,
): Promise<[File, Uint8Array]> => {
  const [file, data] = await lookup(root, location, options);

  if (!(file instanceof File)) {
    throw FileSystemError.FileIsADirectory(location.uri);
  }

  return [file, data as Uint8Array];
};

export const lookupIfFileDirtyWithoutFetching = async (
  root: Directory,
  location: GitHubLocation,
): Promise<boolean> => {
  const entry = await lookupEntry(root, location);
  return isDataDirtyWithoutFetching(entry.sha);
};
