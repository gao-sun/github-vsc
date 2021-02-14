import {
  CancellationToken,
  WebviewView,
  WebviewViewProvider,
  WebviewViewResolveContext,
} from 'vscode';

import view from './view.html';

export class ControlPanelView implements WebviewViewProvider {
  resolveWebviewView(
    webviewView: WebviewView,
    context: WebviewViewResolveContext,
    token: CancellationToken,
  ) {
    webviewView.webview.html = view;
  }
}
