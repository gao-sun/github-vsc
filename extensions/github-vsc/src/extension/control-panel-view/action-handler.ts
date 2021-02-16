import { Octokit } from '@octokit/rest';
import WebviewAction, { WebviewActionEnum } from '@src/types/WebviewAction';
import { ExtensionContext, Webview } from 'vscode';
import { getVSCodeData, setPartialVSCodeData } from '../utils/global-state';
import { updateAPIAuth } from '../github-fs/apis';

export const postAction = (webview: Webview, action: WebviewAction): Thenable<boolean> =>
  webview.postMessage(action);

export const postUpdateData = async (webview: Webview, data?: VSCodeData): Promise<boolean> =>
  postAction(webview, { action: WebviewActionEnum.UpdateData, payload: data });

export const updatePAT = async (
  context: ExtensionContext,
  webview: Webview,
  pat: string,
): Promise<boolean> => {
  const updated = await setPartialVSCodeData(context, { pat });
  updateAPIAuth(pat);
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
): Promise<void> => {
  if (action === WebviewActionEnum.ValidatePAT) {
    const token = String(payload);

    if (!payload || !token) {
      deliverValidatePATResult(webview, true);
      updatePAT(context, webview, token);
    }

    const octokit = new Octokit({ auth: token });

    try {
      const { status } = await octokit.request('/');
      if (status >= 200 && status < 300) {
        deliverValidatePATResult(webview, true);
        updatePAT(context, webview, token);
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
