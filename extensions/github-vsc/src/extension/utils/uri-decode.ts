import { commands, Uri } from 'vscode';
import { GitHubFS } from '../github-fs';
import { getMatchingRef, getRepo } from '../github-fs/apis';
import { GitHubLocation } from '../github-fs/types';

export const getLocation = async (): Promise<Location> => {
  const location = await commands.executeCommand('github-vsc.location.fetch');
  return location as Location;
};

export const replaceLocation = (url: string): Thenable<void> => {
  return commands.executeCommand('github-vsc.location.replace', url);
};

export const decodePathAsOptionalStringArray = async (
  path?: string,
): Promise<Optional<string>[]> => {
  const parsed = path || (await getLocation()).pathname;
  const segments = parsed.split('/').filter((value) => !!value);
  return [segments[0], segments[1], segments.slice(3).join('/')];
};

export const getDefaultBranch = async (owner: string, repo: string): Promise<Optional<string>> => {
  try {
    const {
      data: { default_branch },
    } = await getRepo(owner, repo);
    return default_branch;
  } catch {
    console.error('error when getting repo', owner, repo);
  }
};

export const decodePathAsGitHubLocation = async (
  path?: string,
): Promise<Optional<GitHubLocation>> => {
  const [owner, repo, rest] = await decodePathAsOptionalStringArray(path);

  if (!owner || !repo) {
    return;
  }

  const defaultBranch = await getDefaultBranch(owner, repo);

  // trying to get default branch
  if (!rest) {
    if (!defaultBranch) {
      return;
    }
    return { owner, repo, ref: `refs/heads/${defaultBranch}`, uri: GitHubFS.rootUri };
  }

  const [matchingRef] = rest.split('/');
  try {
    const [{ data: branchData }, { data: tagData }] = await Promise.all([
      getMatchingRef({ owner, repo, ref: matchingRef }, 'branch'),
      getMatchingRef({ owner, repo, ref: matchingRef }, 'tag'),
    ]);

    const found = [...branchData, ...tagData].find(({ ref }) =>
      rest.startsWith(getShortenRef(ref)),
    );

    if (found) {
      const shortenRef = getShortenRef(found.ref);
      return {
        owner,
        repo,
        ref: found.ref,
        uri: Uri.joinPath(GitHubFS.rootUri, rest.slice(shortenRef.length)),
      };
    }

    // fallback to default branch ref
    if (defaultBranch) {
      return { owner, repo, ref: defaultBranch, uri: Uri.joinPath(GitHubFS.rootUri, rest) };
    }
  } catch {
    console.error('error when getting matching ref', owner, repo);
  }
};

export const getShortenRef = (ref: string): string => {
  if (!ref.startsWith('refs/')) {
    return ref;
  }
  const [, , ...values] = ref.split('/');
  return values.join('/');
};
