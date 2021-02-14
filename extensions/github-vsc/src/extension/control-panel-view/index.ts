import {
  CancellationToken,
  Uri,
  WebviewView,
  WebviewViewProvider,
  WebviewViewResolveContext,
} from 'vscode';

import view from './view.html';

export class ControlPanelView implements WebviewViewProvider {
  private readonly _extensionUri: Uri;

  constructor(extensionUri: Uri) {
    this._extensionUri = extensionUri;
  }

  resolveWebviewView(
    webviewView: WebviewView,
    context: WebviewViewResolveContext,
    token: CancellationToken,
  ): void {
    const scriptPath = Uri.joinPath(this._extensionUri, 'dist', 'control-panel.js');
    const scriptUri = webviewView.webview.asWebviewUri(scriptPath);

    console.log('???', scriptPath);

    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = view.replace('$SCRIPT_URI$', scriptUri.toString());
  }
}
