import { FileSystemError } from 'vscode';
import { getEntries } from './getter';
import { dirtyData } from './store';
import { Directory, Entry, File, GitHubLocation } from './types';

const updatedFile = (original: File, newSize: number): File =>
  new File(original.uri, original.name, original.sha, newSize, original.ctime, Date.now());

export const writeFile = async (
  root: Directory,
  { owner, repo, ref, uri }: GitHubLocation,
  data: Uint8Array,
): Promise<void> => {
  let nodeSegment = '';
  let node: Optional<Entry>;
  let parent: Entry = root;

  for (const segment of uri.path.split('/')) {
    if (!segment) {
      continue;
    }

    parent = node ?? root;

    if (!(parent instanceof Directory)) {
      throw FileSystemError.FileNotFound(uri);
    }

    const entryMap = await getEntries({ owner, repo, ref, uri: parent.uri }, parent.sha);
    const child = entryMap.get(segment);

    if (!child) {
      throw FileSystemError.FileNotFound(uri);
    }

    nodeSegment = segment;
    node = child;
  }

  if (!(node instanceof File)) {
    throw FileSystemError.FileNotFound(uri);
  }

  dirtyData[node.sha] = data;
  const entryMap = await getEntries({ owner, repo, ref, uri: parent.uri }, parent.sha);
  entryMap.set(nodeSegment, updatedFile(node, data.byteLength));
};
