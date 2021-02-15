import { FileSystemError } from 'vscode';
import { getData, getEntries } from './getter';
import { Directory, Entry, EntryMap, File, GitHubLocation } from './types';

export const lookup = async (
  root: Directory,
  { owner, repo, ref, uri }: GitHubLocation,
): Promise<[File, Uint8Array] | [Directory, EntryMap]> => {
  let entry: Entry = root;

  for (const segment of uri.path.split('/')) {
    if (!segment) {
      continue;
    }

    if (!(entry instanceof Directory)) {
      throw FileSystemError.FileNotFound(uri);
    }

    const child = (await getEntries({ owner, repo, ref, uri: entry.uri }, entry.sha)).get(segment);

    if (!child) {
      throw FileSystemError.FileNotFound(uri);
    }

    entry = child;
  }

  console.log('lookup result', owner, repo, ref, uri.path, entry);

  if (entry instanceof File) {
    return [entry, await getData({ owner, repo, ref, uri }, entry.sha)];
  }

  if (entry instanceof Directory) {
    return [entry, await getEntries({ owner, repo, ref, uri }, entry.sha)];
  }

  throw FileSystemError.Unavailable(uri);
};

export const lookupAsDirectory = async (
  root: Directory,
  location: GitHubLocation,
): Promise<[Directory, EntryMap]> => {
  const [directory, entries] = await lookup(root, location);

  if (!(directory instanceof Directory)) {
    throw FileSystemError.FileNotADirectory(location.uri);
  }

  return [directory, entries as EntryMap];
};

export const lookupAsDirectorySilently = async (
  root: Directory,
  location: GitHubLocation,
): Promise<[Optional<Directory>, EntryMap]> => {
  try {
    const [directory, entryMap] = await lookupAsDirectory(root, location);
    return [directory, entryMap];
  } catch {
    // ignored
  }
  return [, new Map()];
};

export const lookupAsFile = async (
  root: Directory,
  location: GitHubLocation,
): Promise<[File, Uint8Array]> => {
  const [file, data] = await lookup(root, location);

  if (!(file instanceof File)) {
    throw FileSystemError.FileIsADirectory(location.uri);
  }

  return [file, data as Uint8Array];
};
