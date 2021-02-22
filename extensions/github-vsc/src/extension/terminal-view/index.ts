import { io, Socket } from 'socket.io-client';
import {
  commands,
  ExtensionContext,
  ViewColumn,
  WebviewPanel,
  window as vsCodeWindow,
} from 'vscode';

import view from './view.html';

export class TerminalView {
  private readonly _extensionContext: ExtensionContext;
  private readonly _panel: WebviewPanel;
  // private _socket: Socket;

  constructor(extensionContext: ExtensionContext) {
    commands.executeCommand('workbench.action.editorLayoutTwoRows');
    const panel = vsCodeWindow.createWebviewPanel(
      'github-vsc-terminal',
      'GitHub VSC Terminal',
      ViewColumn.Beside,
      { retainContextWhenHidden: true },
    );
    commands.executeCommand('workbench.action.moveEditorToBelowGroup');
    // const socket = io('ws://localhost:3000');
    this._extensionContext = extensionContext;
    this._panel = panel;

    // this._socket = socket;
    this.render();

    // socket.on('connect', () => {
    //   this.onWrite('Terminal connected.\n');
    //   socket.emit('vsc-client', 1);
    //   socket.emit('vsc-activate-terminal', { file: 'bash' });
    // });

    // socket.on('runner-client-stdout', (data: unknown) => {
    //   this.onWrite(data);
    // });

    // socket.on('runner-client-terminal-closed', () => this.onWrite('terminal closed'));
  }

  private onWrite(data: unknown) {
    this._panel.webview.postMessage(data);
  }

  private onInput(data: string) {
    // this._socket.emit('vsc-cmd', data);
  }

  private render() {
    const webview = this._panel.webview;

    webview.onDidReceiveMessage(
      (event) => this.onInput(event),
      undefined,
      this._extensionContext.subscriptions,
    );
    webview.options = { enableScripts: true };
    webview.html = view;
  }
}
