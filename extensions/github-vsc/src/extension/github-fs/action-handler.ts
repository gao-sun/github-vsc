import WebviewAction, { ProposeChangesPayload, WebviewActionEnum } from '@src/types/WebviewAction';
import { env, ExtensionContext, Uri, Webview } from 'vscode';
import { setPartialVSCodeData } from '../utils/global-state';
import {
  createBlob,
  createCommit,
  createGitRef,
  createTree,
  getRefSilently,
  updateAPIAuth,
  updateGitRef,
} from '../apis';
import { GitHubRef, RepoData, UserContext, VSCodeData } from '@src/types/foundation';
import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import { buildFullRef, buildRef } from '../utils/git-ref';
import { lookupAsFile } from './lookup';
import { Directory, File, GitFileType } from './types';

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

  const { commitMessage, branchName } = payload;

  if (!commitMessage || !branchName) {
    throw new Error('Both commit message and branch name are required.');
  }

  const branchFullRef = buildFullRef(branchName, 'branch');
  const { owner, repo, ref } = githubRef;
  const [matchedRef, matchedBranch] = await Promise.all([
    // use get ref here
    getRefSilently({ owner, repo, ref }, 'branch'),
    getRefSilently({ owner, repo, ref: branchName }, 'branch'),
  ]);

  if (!matchedRef) {
    throw new Error(
      `No matching ref on '${ref}', it could be already deleted, or you do not have the access to.`,
    );
  }

  if (matchedBranch?.ref === branchFullRef) {
    throw new Error(`Branch '${branchName}' already exists.`);
  }

  deliverCommitChangesMessage(webview, `Creating branch ${branchName}...`);
  const { data: newRef } = await createGitRef(owner, repo, branchFullRef, matchedRef.object.sha);

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
    newRef.ref,
    uploadResults.map(([{ mode, uri }, { data: { sha } }]) => ({
      mode,
      path: uri.path.slice(1),
      type: GitFileType.File,
      sha,
    })),
  );

  const {
    data: { sha },
  } = await createCommit(owner, repo, commitMessage, newTreeSha, matchedRef.object.sha);

  await updateGitRef(owner, repo, buildRef(branchName, 'branch'), sha);

  env.openExternal(Uri.parse(`https://github.com/${owner}/${repo}/compare/${branchName}?expand=1`));
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
