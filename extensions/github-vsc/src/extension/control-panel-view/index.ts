import { ExtensionContext, Uri, Webview, WebviewView, WebviewViewProvider } from 'vscode';
import WebviewAction, { WebviewActionEnum } from '@src/types/WebviewAction';

import view from './view.html';
import { RemoteSession } from '../remote-session';

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
    this._remoteSession = new RemoteSession(extensionContext);
  }

  private handleAction = (action: WebviewAction) => {
    if (action.action === WebviewActionEnum.ConnectToRemoteSession) {
      this._remoteSession.conntectTo('ws://localhost:3000', 'uNlJDlaRAibGssDd3hNxJ');
      return;
    }

    if (action.action === WebviewActionEnum.ActivateTerminal) {
      this._remoteSession.createPanelIfNeeded();
      return;
    }
    this._actionHanlder(action);
  };

  resolveWebviewView(webviewView: WebviewView): void {
    const extensionUri = this._extensionContext.extensionUri;
    const webview = webviewView.webview;
    const scriptPath = Uri.joinPath(extensionUri, 'dist', 'control-panel.js');
    const stylesPath = Uri.joinPath(extensionUri, 'dist', 'control-panel.css');
    const scriptUri = webview.asWebviewUri(scriptPath);
    const stylesUri = webview.asWebviewUri(stylesPath);

    this.webview = webview;
    webview.onDidReceiveMessage(this.handleAction, undefined, this._extensionContext.subscriptions);
    webview.options = { enableScripts: true };
    webview.html = view
      .replace('$SCRIPT_URI$', scriptUri.toString())
      .replace('$STYLES_URI$', stylesUri.toString());
  }

  getWebview(): Optional<Webview> {
    return this.webview;
  }
}
