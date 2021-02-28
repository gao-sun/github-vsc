import { ExtensionContext, Webview, WebviewView, WebviewViewProvider } from 'vscode';
import WebviewAction, {
  ActivateTerminalPayload,
  WebviewActionEnum,
} from '@src/core/types/webview-action';
import configureWebview from '../utils/configure-webview';

import { RemoteSession } from '../remote-session';
import { deliverRemoteSessionData, postUpdateData } from '../utils/action-handler';
import { SessionData } from '@src/core/types/foundation';
import { getVSCodeData } from '../utils/global-state';

export class ControlPanelView implements WebviewViewProvider {
  private readonly _extensionContext: ExtensionContext;
  private readonly _actionHanlder: (action: WebviewAction) => void | Promise<void>;
  private _remoteSession: RemoteSession;
  private webview?: Webview;

  constructor(
    extensionContext: ExtensionContext,
    actionHanlder: (action: WebviewAction) => void | Promise<void>,
  ) {
    this._extensionContext = extensionContext;
    this._actionHanlder = actionHanlder;
    this._remoteSession = new RemoteSession(extensionContext, (payload) =>
      deliverRemoteSessionData(this.webview, payload),
    );
  }

  private handleAction = async (action: WebviewAction) => {
    // TO-DO: refactor
    if (action.action === WebviewActionEnum.ConnectToRemoteSession) {
      const payload = action.payload as SessionData;
      if (await this._remoteSession.connectTo(payload)) {
        postUpdateData(this.webview, getVSCodeData(this._extensionContext));
      }
    }

    if (action.action === WebviewActionEnum.RequestRemoteRessionData) {
      this._remoteSession.deliverStatusData();
    }

    if (action.action === WebviewActionEnum.ActivateTerminal) {
      const { shell } = action.payload as ActivateTerminalPayload;
      this._remoteSession.activateTerminal(shell);
    }

    if (action.action === WebviewActionEnum.DisconnectRemoteRession) {
      this._remoteSession.disconnect();
    }

    if (action.action === WebviewActionEnum.TerminateRemoteRession) {
      if (await this._remoteSession.terminate()) {
        postUpdateData(this.webview, getVSCodeData(this._extensionContext));
      }
    }

    this._actionHanlder(action);
  };

  resolveWebviewView(webviewView: WebviewView): void {
    const webview = webviewView.webview;

    configureWebview(
      this._extensionContext,
      webview,
      'control-panel',
      'GitHub VSC Control Panel',
      this.handleAction,
      this._extensionContext.subscriptions,
    );

    this.webview = webview;
  }

  getWebview(): Optional<Webview> {
    return this.webview;
  }
}
