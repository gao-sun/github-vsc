import { Octokit } from '@octokit/rest';
import { RequestError } from '@octokit/request-error';
import WebviewAction, { WebviewActionEnum } from '@src/types/WebviewAction';
import { Webview } from 'vscode';

export const postAction = (webview: Webview, action: WebviewAction): Thenable<boolean> =>
  webview.postMessage(action);

export const updateVSCodeData = (webview: Webview, data: VSCodeData): Thenable<boolean> =>
  postAction(webview, { action: WebviewActionEnum.UpdateData, payload: data });

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
  webview: Webview,
  { action, payload }: WebviewAction,
): Promise<void> => {
  if (action === WebviewActionEnum.ValidatePAT) {
    const octokit = new Octokit({ auth: String(payload) });
    try {
      const { status } = await octokit.request('/');
      if (status >= 200 && status < 300) {
        deliverValidatePATResult(webview, true);
        updateVSCodeData(webview, { pat: String(payload) });
      } else {
        deliverValidatePATResult(webview, false);
      }
    } catch (error) {
      deliverValidatePATResult(webview, false, (error as RequestError).message);
    }
  }
};
