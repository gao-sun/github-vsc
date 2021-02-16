import { ExtensionContext, Uri, Webview, WebviewView, WebviewViewProvider } from 'vscode';
import WebviewAction from '@src/types/WebviewAction';

import view from './view.html';
import { actionHandler } from './action-handler';

export class ControlPanelView implements WebviewViewProvider {
  private readonly _extensionContext: ExtensionContext;
  private readonly _onDataUpdated: () => void | Promise<void>;
  private webview?: Webview;

  constructor(extensionContext: ExtensionContext, onDataUpdated: () => void | Promise<void>) {
    this._extensionContext = extensionContext;
    this._onDataUpdated = onDataUpdated;
  }

  resolveWebviewView(webviewView: WebviewView): void {
    const extensionUri = this._extensionContext.extensionUri;
    const webview = webviewView.webview;
    const scriptPath = Uri.joinPath(extensionUri, 'dist', 'control-panel.js');
    const stylesPath = Uri.joinPath(extensionUri, 'dist', 'control-panel.css');
    const scriptUri = webview.asWebviewUri(scriptPath);
    const stylesUri = webview.asWebviewUri(stylesPath);

    this.webview = webview;
    webview.onDidReceiveMessage(
      (action: WebviewAction) =>
        actionHandler(this._extensionContext, webview, action, this._onDataUpdated),
      undefined,
      this._extensionContext.subscriptions,
    );
    webview.options = { enableScripts: true };
    webview.html = view
      .replace('$SCRIPT_URI$', scriptUri.toString())
      .replace('$STYLES_URI$', stylesUri.toString());
  }

  getWebview(): Optional<Webview> {
    return this.webview;
  }
}
