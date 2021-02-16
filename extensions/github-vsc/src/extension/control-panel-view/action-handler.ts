import { Octokit } from '@octokit/rest';
import WebviewAction, { WebviewActionEnum } from '@src/types/WebviewAction';
import { ExtensionContext, Webview } from 'vscode';
import { getVSCodeData, setPartialVSCodeData } from '../utils/global-state';
import { updateAPIAuth } from '../apis';
import { RepoData, UserContext, VSCodeData } from '@src/types/foundation';

export const postAction = (webview: Webview, action: WebviewAction): Thenable<boolean> =>
  webview.postMessage(action);

export const postUpdateData = async (webview: Webview, data?: VSCodeData): Promise<boolean> =>
  postAction(webview, { action: WebviewActionEnum.UpdateData, payload: data });

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

const deliverValidatePATResult = (
  webview: Webview,
  success: boolean,
  message?: string,
): Thenable<boolean> =>
  postAction(webview, {
    action: WebviewActionEnum.ValidatePATResult,
    payload: {
      success,
      message,
    },
  });

export const actionHandler = async (
  context: ExtensionContext,
  webview: Webview,
  { action, payload }: WebviewAction,
  onDataUpdated: () => void | Promise<void>,
): Promise<void> => {
  if (action === WebviewActionEnum.ValidatePAT) {
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
        await updateUserContext(context, webview, { pat: token, id, login, avatarUrl: avatar_url });
        onDataUpdated();
      } else {
        deliverValidatePATResult(webview, false);
      }
    } catch (error) {
      deliverValidatePATResult(webview, false, error?.message ?? 'Endpoint responded with error.');
    }
  }

  if (action === WebviewActionEnum.RequestData) {
    postUpdateData(webview, getVSCodeData(context));
  }
};
