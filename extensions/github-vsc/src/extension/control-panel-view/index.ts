import { ExtensionContext, Webview, WebviewView, WebviewViewProvider } from 'vscode';
import WebviewAction from '@src/core/types/webview-action';
import configureWebview from '../utils/configure-webview';

export class ControlPanelView implements WebviewViewProvider {
  private readonly _extensionContext: ExtensionContext;
  private readonly _actionHanlder: (action: WebviewAction) => void | Promise<void>;
  private webview?: Webview;

  constructor(
    extensionContext: ExtensionContext,
    actionHanlder: (action: WebviewAction) => void | Promise<void>,
  ) {
    this._extensionContext = extensionContext;
    this._actionHanlder = actionHanlder;
  }

  resolveWebviewView(webviewView: WebviewView): void {
    const webview = webviewView.webview;

    configureWebview(
      this._extensionContext,
      webview,
      'control-panel',
      'GitHub VSC Control Panel',
      this._actionHanlder,
      this._extensionContext.subscriptions,
    );

    this.webview = webview;
  }

  getWebview(): Optional<Webview> {
    return this.webview;
  }
}
