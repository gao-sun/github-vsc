import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import { OctokitResponse } from '@octokit/types';
import { GitHubRef, UserContext } from '@src/types/foundation';
import { Buffer } from 'buffer/';
import { FileType, Uri } from 'vscode';
import { Directory, Entry, File, GitFileMode, GitHubLocation } from './github-fs/types';
import { getShortenRef } from './utils/git-ref';

let octokit = new Octokit();

export const updateAPIAuth = (pat?: string): void => {
  octokit = new Octokit({ auth: pat });
};

const getPathType = (type: string): Optional<FileType> => {
  if (type === 'blob') {
    return FileType.File;
  }
  if (type === 'tree') {
    return FileType.Directory;
  }
};

const getFileMode = (mode: string): Optional<GitFileMode> =>
  Object.values(GitFileMode).find((value) => value === mode);

export const readTree = async ({ owner, repo, ref, uri }: GitHubLocation): Promise<Entry[]> => {
  try {
    const { data } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: `${ref}${uri.path.replace(/\//, ':')}`,
    });

    return data.tree
      .map(({ path, type, size, sha, mode }) => {
        if (!path || !type || !sha || !mode) {
          return;
        }

        const fileType = getPathType(type);
        const fileMode = getFileMode(mode);

        if (!fileMode) {
          return;
        }

        if (fileType === FileType.Directory) {
          return new Directory(Uri.joinPath(uri, path), path, sha, fileMode, size);
        }

        if (fileType === FileType.File) {
          return new File(Uri.joinPath(uri, path), path, sha, fileMode, size);
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

export const getRepo = (
  owner: string,
  repo: string,
): Promise<RestEndpointMethodTypes['repos']['get']['response']> =>
  octokit.repos.get({ owner, repo });

const prependIfNeeded = (str: string, prefix: string): string =>
  str.startsWith(prefix) ? str : `${prefix}${str}`;

export const getMatchingRef = (
  { owner, repo, ref }: Omit<GitHubRef, 'sha'>,
  type: 'branch' | 'tag',
): Promise<RestEndpointMethodTypes['git']['listMatchingRefs']['response']> =>
  octokit.git.listMatchingRefs({
    owner,
    repo,
    ref: prependIfNeeded(getShortenRef(ref), type === 'branch' ? 'heads/' : 'tags/'),
  });

export const getRef = (
  { owner, repo, ref }: Omit<GitHubRef, 'sha'>,
  type: 'branch' | 'tag',
): Promise<RestEndpointMethodTypes['git']['getRef']['response']> =>
  octokit.git.getRef({
    owner,
    repo,
    ref: prependIfNeeded(getShortenRef(ref), type === 'branch' ? 'heads/' : 'tags/'),
  });

export const getRefSilently = async (
  { owner, repo, ref }: Omit<GitHubRef, 'sha'>,
  type: 'branch' | 'tag',
): Promise<Optional<RestEndpointMethodTypes['git']['getRef']['response']['data']>> => {
  try {
    const { data } = await octokit.git.getRef({
      owner,
      repo,
      ref: prependIfNeeded(getShortenRef(ref), type === 'branch' ? 'heads/' : 'tags/'),
    });
    return data;
  } catch {}
  return;
};

export type SearchResponse = RestEndpointMethodTypes['search']['code']['response']['data'];

export type SearchRequest = Promise<OctokitResponse<SearchResponse>>;

export const searchCode = (owner: string, repo: string, q: string): SearchRequest =>
  octokit.request<SearchResponse>(
    octokit.search.code.endpoint({
      q: `${q}+in:file+repo:${owner}/${repo}`,
      headers: { accept: 'application/vnd.github.v3.text-match+json' },
    }),
  );

export const getPermission = (
  owner: string,
  repo: string,
  userContext: UserContext,
): Promise<RestEndpointMethodTypes['repos']['getCollaboratorPermissionLevel']['response']> =>
  octokit.repos.getCollaboratorPermissionLevel({ owner, repo, username: userContext.login });

export const createGitRef = (
  owner: string,
  repo: string,
  ref: string,
  sha: string,
): Promise<RestEndpointMethodTypes['git']['createRef']['response']> =>
  octokit.git.createRef({ owner, repo, ref, sha });

export const createBlob = (
  owner: string,
  repo: string,
  content: Uint8Array,
): Promise<RestEndpointMethodTypes['git']['createBlob']['response']> =>
  octokit.git.createBlob({ owner, repo, content: Buffer.from(content).toString('utf-8') });
