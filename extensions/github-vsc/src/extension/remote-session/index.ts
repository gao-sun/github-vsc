import {
  commands,
  Disposable,
  ExtensionContext,
  ViewColumn,
  WebviewPanel,
  window as vsCodeWindow,
} from 'vscode';
import { io, Socket } from 'socket.io-client';
import {
  VscClientEvent,
  RunnerServerEvent,
  TerminalOptions,
  RunnerClientEvent,
  RunnerClientStatus,
} from '@github-vsc-runner/core';
import { nanoid } from 'nanoid';

import { TerminalData } from '@core/types/foundation';
import configureWebview from '../utils/configure-webview';
import WebviewAction, {
  TerminalDimensionsPayload,
  WebviewActionEnum,
} from '@src/core/types/WebviewAction';

export enum RunnerStatus {
  Disconnected,
  Connected,
  SessionStarted,
  SessionTimeout,
}

export class RemoteSession implements Disposable {
  // MARK: disposable
  private readonly _extensionContext: ExtensionContext;
  private _panel?: WebviewPanel;
  private _terminals: TerminalOptions[];
  runnerStatus: RunnerStatus;
  runnerClientStatus: RunnerClientStatus;
  sessionId?: string;
  socket?: Socket;

  set terminals(terminals: TerminalOptions[]) {
    this._terminals = terminals;
    this.postTerminalsToWebview();
  }

  get terminals(): TerminalOptions[] {
    return this._terminals;
  }

  constructor(extensionContext: ExtensionContext) {
    this._extensionContext = extensionContext;
    this.runnerStatus = RunnerStatus.Disconnected;
    this.runnerClientStatus = RunnerClientStatus.Offline;
    this._terminals = [];
  }

  dispose(): void {}

  // MARK: session control
  async conntectTo(serverAddress: string, sessionId?: string): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = io(serverAddress);
      const timeoutHandle = setTimeout(() => {
        if (this.runnerStatus === RunnerStatus.Connected) {
          this.runnerStatus = RunnerStatus.SessionTimeout;
          resolve(false);
        }
      }, 20000);
      const clearTimeoutHandleIfNeeded = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      };

      this.runnerStatus = RunnerStatus.Disconnected;
      this.runnerClientStatus = RunnerClientStatus.Offline;
      this.socket = socket;
      this.terminals = [];
      this.sessionId = sessionId;

      socket.on('connect', () => {
        console.log('runner connected');
        socket.emit(VscClientEvent.SetType, this.sessionId);
        this.runnerStatus = RunnerStatus.Connected;
      });

      socket.on('disconnect', () => {
        console.log('runner disconnected');

        if (this.runnerStatus !== RunnerStatus.SessionTimeout) {
          this.runnerStatus = RunnerStatus.Disconnected;
        }

        clearTimeoutHandleIfNeeded();
      });

      socket.on(RunnerServerEvent.SessionStarted, (id: string) => {
        if (this.sessionId && this.sessionId !== id) {
          console.warn("session id doesn't match, skipping");
          return;
        }

        if (this.runnerStatus !== RunnerStatus.Connected) {
          console.warn(
            `runner status not correct, expect ${RunnerStatus.Connected}, found ${this.runnerStatus}, skipping`,
          );
          return;
        }

        clearTimeoutHandleIfNeeded();

        this.runnerStatus = RunnerStatus.SessionStarted;
        this.registerSocketEventListeners();
        console.log('session started', id);

        if (this.sessionId) {
          this.retrieveRunnerInfo();
        }

        this.sessionId = id;
        resolve(true);
      });
    });
  }

  private registerSocketEventListeners() {
    this.socket?.on(RunnerClientEvent.CurrentTerminals, (terminals: TerminalOptions[]) => {
      console.log('received current terminals', terminals);
      this.terminals = terminals;
    });
    this.socket?.on(RunnerClientEvent.TerminalClosed, (terminalId: string) => {
      this.terminals = this.terminals.filter(({ id }) => id !== terminalId);
    });
    this.socket?.on(RunnerClientEvent.Stdout, (terminalId: string, data: unknown) => {
      console.log('stdout', terminalId, data);
      const action = {
        action: WebviewActionEnum.TerminalStdout,
        payload: { terminalId, data },
      };
      this._panel?.webview.postMessage(action);
    });
    this.socket?.on(RunnerServerEvent.RunnerStatus, (status: RunnerClientStatus) => {
      this.runnerClientStatus = status;
    });
  }

  private handleAction = ({ action, payload }: WebviewAction) => {
    if (action === WebviewActionEnum.RequestData) {
      this.postTerminalsToWebview();
    }

    if (action === WebviewActionEnum.TerminalCmd) {
      const { terminalId, data } = payload as TerminalData;
      console.log('on input', terminalId, data);
      this.socket?.emit(VscClientEvent.Cmd, terminalId, data);
    }

    if (action === WebviewActionEnum.ActivateTerminal) {
      this.activateTerminal();
    }

    if (action === WebviewActionEnum.TerminalSetDimensions) {
      const { id, rows, cols } = payload as TerminalDimensionsPayload;
      this.socket?.emit(VscClientEvent.SetTerminalDimensions, id, { rows, cols });
    }
  };

  private postTerminalsToWebview() {
    const action: WebviewAction = {
      action: WebviewActionEnum.SetTerminals,
      payload: this.terminals.map(({ id }) => id),
    };
    this._panel?.webview.postMessage(action);
  }

  private retrieveRunnerInfo() {
    this.socket?.emit(VscClientEvent.CheckRunnerStatus);
    this.socket?.emit(VscClientEvent.FetchCurrentTerminals);
  }

  activateTerminal(ignoreIfExists = false): boolean {
    if (this.runnerClientStatus === RunnerClientStatus.Offline) {
      return false;
    }

    this.createPanelIfNeeded();
    if (!ignoreIfExists || !this.terminals.length) {
      const options: TerminalOptions = {
        id: nanoid(),
        file: 'bash',
        cols: 80,
        rows: 30,
      };
      this.terminals = this.terminals.concat(options);
      this.socket?.emit(VscClientEvent.ActivateTerminal, options);
    }
    return true;
  }

  activateTerminalIfNeeded(): boolean {
    return this.activateTerminal(true);
  }

  createPanelIfNeeded(): void {
    if (this._panel) {
      return;
    }

    commands.executeCommand('workbench.action.editorLayoutTwoRows');

    const panel = vsCodeWindow.createWebviewPanel(
      'github-vsc-terminal',
      'GitHub VSC Terminal',
      ViewColumn.Beside,
      { retainContextWhenHidden: true },
    );
    const webview = panel.webview;

    this._panel = panel;
    configureWebview(
      this._extensionContext,
      webview,
      'terminal-app',
      'GitHub VSC Terminal',
      this.handleAction,
      this._extensionContext.subscriptions,
    );

    commands.executeCommand('workbench.action.moveEditorToBelowGroup');
  }
}
