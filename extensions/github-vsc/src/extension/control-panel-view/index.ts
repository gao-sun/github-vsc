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
    const stylesPath = Uri.joinPath(this._extensionUri, 'dist', 'control-panel.css');
    const scriptUri = webviewView.webview.asWebviewUri(scriptPath);
    const stylesUri = webviewView.webview.asWebviewUri(stylesPath);

    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = view
      .replace('$SCRIPT_URI$', scriptUri.toString())
      .replace('$STYLES_URI$', stylesUri.toString());
  }
}
