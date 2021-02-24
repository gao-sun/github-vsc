import { Disposable, ExtensionContext, Uri, Webview } from 'vscode';
import WebviewAction from '@core/types/WebviewAction';
import view from '@src/static/spa-template.html';

const configureWebview = (
  context: ExtensionContext,
  webview: Webview,
  appName: string,
  title: string,
  actionHandler: (action: WebviewAction) => void,
  disposables?: Disposable[],
): void => {
  const extensionUri = context.extensionUri;
  const scriptPath = Uri.joinPath(extensionUri, 'dist', `${appName}.js`);
  const stylesPath = Uri.joinPath(extensionUri, 'dist', `${appName}.css`);
  const scriptUri = webview.asWebviewUri(scriptPath);
  const stylesUri = webview.asWebviewUri(stylesPath);

  webview.onDidReceiveMessage(actionHandler, undefined, disposables);
  webview.options = { enableScripts: true };
  webview.html = view
    .replace('$PAGE_TITLE$', title)
    .replace('$SCRIPT_URI$', scriptUri.toString())
    .replace('$STYLES_URI$', stylesUri.toString());
};

export default configureWebview;
