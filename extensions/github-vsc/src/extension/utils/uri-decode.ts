import { commands } from 'vscode';
import { getMatchingRef, getRepo } from '../github-fs/apis';
import { GitHubRef } from '../github-fs/types';

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

export const decodePathAsGitHubRef = async (path?: string): Promise<Optional<GitHubRef>> => {
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
    return { owner, repo, ref: `refs/heads/${defaultBranch}` };
  }

  const [matchingRef] = rest.split('/');
  try {
    const [{ data: branchData }, { data: tagData }] = await Promise.all([
      getMatchingRef({ owner, repo, ref: matchingRef }, 'branch'),
      getMatchingRef({ owner, repo, ref: matchingRef }, 'tag'),
    ]);

    const found = [...branchData, ...tagData].find(({ ref }) => {
      const [, , ...values] = ref.split('/');
      return rest.startsWith(values.join('/'));
    });

    if (found) {
      return { owner, repo, ref: found.ref };
    }

    // fallback to default branch ref
    if (defaultBranch) {
      return { owner, repo, ref: defaultBranch };
    }
  } catch {
    console.error('error when getting matching ref', owner, repo);
  }
};
