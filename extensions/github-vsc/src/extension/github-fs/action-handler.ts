import WebviewAction, {
  ProposeChangesPayload,
  WebviewActionEnum,
} from '@core/types/WebviewAction';
import { env, ExtensionContext, Uri, Webview } from 'vscode';
import { setPartialVSCodeData } from '../utils/global-state';
import {
  createBlob,
  createCommit,
  createFork,
  createGitRef,
  createTree,
  getRefSilently,
  isForkReady,
  updateAPIAuth,
  updateGitRef,
} from '../apis';
import {
  CommitMethod,
  GitHubRef,
  RepoData,
  UserContext,
  VSCodeData,
} from '@core/types/foundation';
import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import { buildFullRef, buildRef, getShortenRef } from '../utils/git-ref';
import { lookupAsFile } from './lookup';
import { Directory, File, GitFileType } from './types';
import dayjs from 'dayjs';
import { wait } from '../utils/wait';
import { conditional } from '../utils/object';

export const postAction = async (
  webview: Optional<Webview>,
  action: WebviewAction,
): Promise<boolean> => webview?.postMessage(action) ?? true;

export const postUpdateData = async (
  webview: Optional<Webview>,
  data?: VSCodeData,
): Promise<boolean> => postAction(webview, { action: WebviewActionEnum.UpdateData, payload: data });

export const updateUserContext = async (
  context: ExtensionContext,
  webview: Optional<Webview>,
  userContext?: UserContext,
): Promise<boolean> => {
  const updated = await setPartialVSCodeData(context, { userContext });
  updateAPIAuth(userContext?.pat);

  if (!webview) {
    return true;
  }

  return postUpdateData(webview, updated);
};

export const updateRepoData = async (
  context: ExtensionContext,
  webview: Optional<Webview>,
  repoData?: RepoData,
): Promise<boolean> => {
  const updated = await setPartialVSCodeData(context, { repoData });

  if (!webview) {
    return true;
  }

  return postUpdateData(webview, updated);
};

const deliverValidatePATResult = async (
  webview: Optional<Webview>,
  success: boolean,
  message?: string,
): Promise<boolean> => {
  if (!webview) {
    return true;
  }
  return postAction(webview, {
    action: WebviewActionEnum.ValidatePATResult,
    payload: {
      success,
      message,
    },
  });
};

export const validatePAT = async (
  webview: Optional<Webview>,
  context: ExtensionContext,
  payload: unknown,
  onDataUpdated: () => void,
): Promise<void> => {
  const token = String(payload);

  if (!payload || !token) {
    deliverValidatePATResult(webview, true);
    await updateUserContext(context, webview, undefined);
    onDataUpdated();
    return;
  }

  const octokit = new Octokit({ auth: token });

  try {
    const {
      status,
      data: { id, login, avatar_url },
    } = await octokit.users.getAuthenticated();
    if (status >= 200 && status < 300) {
      deliverValidatePATResult(webview, true);
      await updateUserContext(context, webview, {
        pat: token,
        id,
        login,
        avatarUrl: avatar_url,
      });
      onDataUpdated();
    } else {
      deliverValidatePATResult(webview, false);
    }
  } catch (error) {
    deliverValidatePATResult(webview, false, error?.message ?? 'Endpoint responded with error.');
  }
};

const deliverCommitChangesResult = async (
  webview: Optional<Webview>,
  success: boolean,
  message?: string,
): Promise<boolean> => {
  if (!webview) {
    return true;
  }
  return postAction(webview, {
    action: WebviewActionEnum.CommitChangesResult,
    payload: {
      success,
      message,
    },
  });
};

const deliverCommitChangesMessage = async (
  webview: Optional<Webview>,
  message: string,
): Promise<boolean> => {
  if (!webview) {
    return true;
  }
  return postAction(webview, {
    action: WebviewActionEnum.CommitChangesMessage,
    payload: message,
  });
};

const getCommitRepo = async (
  webview: Optional<Webview>,
  commitMethod: CommitMethod,
  owner: string,
  repo: string,
) => {
  if (commitMethod !== CommitMethod.Fork) {
    return [owner, repo];
  }

  deliverCommitChangesMessage(webview, `Forking ${owner}/${repo}...`);
  const {
    data: { full_name },
  } = await createFork(owner, repo);
  const [forkOwner, forkRepo] = full_name.split('/');

  const startTime = dayjs();

  while (!(await isForkReady(forkOwner, forkRepo))) {
    if (dayjs().diff(startTime, 'seconds') >= 30) {
      throw new Error(
        `Forking ${owner}/${repo} took too long. Please contact GitHub support if needed.`,
      );
    }
    await wait(1000);
  }

  return [forkOwner, forkRepo];
};

const getBranchRefAndShaForCommit = async (
  webview: Optional<Webview>,
  commitMethod: CommitMethod,
  originalOwner: string,
  originalRepo: string,
  originalRef: string,
  owner: string,
  repo: string,
  branchName: string,
): Promise<[string, string]> => {
  const branchFullRef = buildFullRef(branchName, 'branch');
  const [matchedRef, matchedBranch] = await Promise.all([
    getRefSilently({ owner: originalOwner, repo: originalRepo, ref: originalRef }, 'branch'),
    conditional(
      commitMethod !== CommitMethod.Commit &&
        getRefSilently({ owner, repo, ref: branchName }, 'branch'),
    ),
  ]);

  if (!matchedRef) {
    throw new Error(
      `No matching ref '${originalRef}' in ${originalOwner}/${originalRepo}, it could be already deleted, or you do not have the access to.`,
    );
  }

  if (commitMethod === CommitMethod.Commit) {
    return [originalRef, matchedRef.object.sha];
  }

  if (matchedBranch?.ref === branchFullRef) {
    throw new Error(`Branch '${branchName}' already exists.`);
  }

  deliverCommitChangesMessage(webview, `Creating branch ${branchName}...`);
  const {
    data: { ref },
  } = await createGitRef(owner, repo, branchFullRef, matchedRef.object.sha);
  return [ref, matchedRef.object.sha];
};

const _commitChanges = async (
  webview: Optional<Webview>,
  githubRef: Optional<GitHubRef>,
  payload: ProposeChangesPayload,
  changedFiles: Uri[],
  root: Directory,
) => {
  if (!githubRef) {
    throw new Error('Missing repo info.');
  }

  const { commitMethod, commitMessage, branchName } = payload;

  if (commitMethod !== CommitMethod.Commit && (!commitMessage || !branchName)) {
    throw new Error('Both commit message and branch name are required.');
  }

  if (commitMethod === CommitMethod.Commit && !commitMessage) {
    throw new Error('Commit message is required.');
  }

  const { owner: originalOwner, repo: originalRepo, ref } = githubRef;
  const [owner, repo] = await getCommitRepo(webview, commitMethod, originalOwner, originalRepo);
  const [refForCommit, shaForCommit] = await getBranchRefAndShaForCommit(
    webview,
    commitMethod,
    originalOwner,
    originalRepo,
    ref,
    owner,
    repo,
    branchName,
  );
  const branchForCommit = getShortenRef(refForCommit);

  deliverCommitChangesMessage(webview, 'Uploading files...');
  const files = await Promise.all(
    changedFiles.map((uri) => lookupAsFile(root, { ...githubRef, uri })),
  );
  const uploadResults = await Promise.all(
    files.map(
      async ([file, blob]): Promise<
        [File, RestEndpointMethodTypes['git']['createBlob']['response']]
      > => [file, await createBlob(owner, repo, blob)],
    ),
  );

  deliverCommitChangesMessage(webview, `Committing changes...`);
  const {
    data: { sha: newTreeSha },
  } = await createTree(
    owner,
    repo,
    refForCommit,
    uploadResults.map(([{ mode, uri }, { data: { sha } }]) => ({
      mode,
      path: uri.path.slice(1),
      type: GitFileType.File,
      sha,
    })),
  );

  const {
    data: { sha },
  } = await createCommit(owner, repo, commitMessage, newTreeSha, shaForCommit);

  await updateGitRef(owner, repo, buildRef(refForCommit, 'branch'), sha);

  if (commitMethod === CommitMethod.Commit) {
    env.openExternal(Uri.parse(`https://github.com/${owner}/${repo}/commit/${sha}`));
  }

  if (commitMethod === CommitMethod.PR) {
    env.openExternal(
      Uri.parse(`https://github.com/${owner}/${repo}/compare/${branchForCommit}?expand=1`),
    );
  }

  if (commitMethod === CommitMethod.Fork) {
    env.openExternal(
      Uri.parse(
        `https://github.com/${originalOwner}/${originalRepo}/compare/${getShortenRef(
          ref,
        )}...${owner}:${branchForCommit}?expand=1`,
      ),
    );
  }
};

export const commitChanges = async (
  webview: Optional<Webview>,
  githubRef: Optional<GitHubRef>,
  payload: ProposeChangesPayload,
  changedFiles: Uri[],
  root: Directory,
): Promise<void> => {
  try {
    await _commitChanges(webview, githubRef, payload, changedFiles, root);
    deliverCommitChangesResult(webview, true);
  } catch (error) {
    deliverCommitChangesResult(webview, false, error?.message ?? 'Submitting changes failed.');
  }
};
