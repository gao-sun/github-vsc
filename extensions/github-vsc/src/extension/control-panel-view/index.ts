import { ExtensionContext, Webview, WebviewView, WebviewViewProvider } from 'vscode';
import WebviewAction, {
  ActivateTerminalPayload,
  WebviewActionEnum,
} from '@src/core/types/webview-action';
import configureWebview from '../utils/configure-webview';

import { RemoteSession } from '../remote-session';
import { deliverRemoteSessionData } from '../utils/action-handler';
import { SessionData } from '@src/core/types/foundation';

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

  private handleAction = (action: WebviewAction) => {
    // TO-DO: refactor
    if (action.action === WebviewActionEnum.ConnectToRemoteSession) {
      const payload = action.payload as SessionData;
      this._remoteSession.connectTo(payload);
    }

    if (action.action === WebviewActionEnum.RequestRemoteRessionData) {
      this._remoteSession.deliverStatusData();
    }

    if (action.action === WebviewActionEnum.ActivateTerminal) {
      const { shell } = action.payload as ActivateTerminalPayload;
      this._remoteSession.activateTerminal(shell);
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
