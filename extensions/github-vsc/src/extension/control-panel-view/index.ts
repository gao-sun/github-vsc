import { ExtensionContext, Uri, WebviewView, WebviewViewProvider } from 'vscode';
import WebviewAction from '@src/types/WebviewAction';

import view from './view.html';
import { actionHandler } from './action-handler';

export class ControlPanelView implements WebviewViewProvider {
  private readonly _extensionContext: ExtensionContext;

  constructor(extensionContext: ExtensionContext) {
    this._extensionContext = extensionContext;
  }

  resolveWebviewView(webviewView: WebviewView): void {
    const extensionUri = this._extensionContext.extensionUri;
    const webview = webviewView.webview;
    const scriptPath = Uri.joinPath(extensionUri, 'dist', 'control-panel.js');
    const stylesPath = Uri.joinPath(extensionUri, 'dist', 'control-panel.css');
    const scriptUri = webview.asWebviewUri(scriptPath);
    const stylesUri = webview.asWebviewUri(stylesPath);

    webview.onDidReceiveMessage(
      (action: WebviewAction) => actionHandler(this._extensionContext, webview, action),
      undefined,
      this._extensionContext.subscriptions,
    );
    webview.options = { enableScripts: true };
    webview.html = view
      .replace('$SCRIPT_URI$', scriptUri.toString())
      .replace('$STYLES_URI$', stylesUri.toString());
  }
}
