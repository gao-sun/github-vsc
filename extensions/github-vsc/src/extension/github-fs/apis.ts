import { Octokit } from '@octokit/rest';
import { Buffer } from 'buffer/';
import { FileType, Uri } from 'vscode';
import { Directory, Entry, File, GitHubLocation } from './types';

let octokit = new Octokit();

export const updateOctokit = (newKit: Octokit): void => {
  octokit = newKit;
};

const getPathType = (type: string): Optional<FileType> => {
  if (type === 'blob') {
    return FileType.File;
  }
  if (type === 'tree') {
    return FileType.Directory;
  }
};

export const readTree = async ({ owner, repo, uri }: GitHubLocation): Promise<Entry[]> => {
  try {
    const { data } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: `master${uri.path.replace(/\//, ':')}`,
    });

    return data.tree
      .map(({ path, type, size, sha }) => {
        if (!path || !type || !sha) {
          return;
        }

        const fileType = getPathType(type);

        if (fileType === FileType.Directory) {
          return new Directory(Uri.joinPath(uri, path), path, sha, size);
        }

        if (fileType === FileType.File) {
          return new File(Uri.joinPath(uri, path), path, sha, size);
        }
      })
      .compact();
  } catch (error) {
    console.error('error when reading tree', uri.path, error);
  }

  return [];
};

export const readBlob = async (
  { owner, repo }: GitHubLocation,
  sha: string,
): Promise<Uint8Array> => {
  const { data } = await octokit.git.getBlob({
    owner,
    repo,
    file_sha: sha,
  });

  // TO-DO: double check eligibility
  return Buffer.from(data.content, data.encoding as BufferEncoding);
};

export const readEntries = async (location: GitHubLocation): Promise<Map<string, Entry>> =>
  new Map((await readTree(location)).map((entry) => [entry.name, entry]));
