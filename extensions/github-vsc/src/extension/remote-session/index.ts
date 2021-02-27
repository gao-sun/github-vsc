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

import { SessionOS, TerminalData } from '@core/types/foundation';
import configureWebview from '../utils/configure-webview';
import WebviewAction, {
  RemoteSessionDataPayload,
  TerminalDimensionsPayload,
  WebviewActionEnum,
} from '@src/core/types/webview-action';
import { SessionData } from '@src/core/types/foundation';
import { RunnerStatus } from './types';
import { conditional } from '../utils/object';
import { RunnerStatusData } from '@src/core/types/session';
import { setSessionData } from '../utils/global-state';

export class RemoteSession implements Disposable {
  // MARK: disposable
  private readonly _extensionContext: ExtensionContext;
  private _panel?: WebviewPanel;
  private _data?: SessionData;
  private _terminals: TerminalOptions[];
  private _onUpdate: (payload: RemoteSessionDataPayload) => void;
  private _runnerStatusData: RunnerStatusData = {
    runnerStatus: RunnerStatus.Disconnected,
    runnerClientStatus: RunnerClientStatus.Offline,
  };
  socket?: Socket;

  setPartialRunnerStatusData(partial: Partial<RunnerStatusData>): void {
    this._runnerStatusData = { ...this._runnerStatusData, ...partial };
    this.deliverStatusData();
  }

  get runnerStatusData(): RunnerStatusData {
    return this._runnerStatusData;
  }

  get runnerStatus(): RunnerStatus {
    return this._runnerStatusData.runnerStatus;
  }

  set runnerStatus(runnerStatus: RunnerStatus) {
    this.setPartialRunnerStatusData({ runnerStatus });
  }

  get runnerClientStatus(): RunnerClientStatus {
    return this._runnerStatusData.runnerClientStatus;
  }

  set runnerClientStatus(runnerClientStatus: RunnerClientStatus) {
    this.setPartialRunnerStatusData({ runnerClientStatus });
  }

  set terminals(terminals: TerminalOptions[]) {
    this._terminals = terminals;
    this.postTerminalsToWebview();
  }

  get terminals(): TerminalOptions[] {
    return this._terminals;
  }

  private get sessionId(): Optional<string> {
    return this._data?.sessionId;
  }

  private set sessionId(sessionId: Optional<string>) {
    if (!sessionId) {
      this._data = undefined;
      return;
    }

    if (this._data) {
      this._data = { ...this._data, sessionId };
    }
  }

  constructor(
    extensionContext: ExtensionContext,
    onUpdate: (payload: RemoteSessionDataPayload) => void,
  ) {
    this._extensionContext = extensionContext;
    this._onUpdate = onUpdate;
    this._terminals = [];
  }

  dispose(): void {}

  // MARK: webview message
  deliverStatusData(): void {
    const { runnerStatusData: data, _onUpdate: onUpdate } = this;

    if (!onUpdate) {
      return;
    }

    if (data.runnerStatus === RunnerStatus.Connected) {
      onUpdate({
        ...data,
        type: 'message',
        message: `Runner conncted. ${
          this.sessionId ? `Resuming session ${this.sessionId}` : 'Reuqesting new session'
        }...`,
      });
    }

    if (data.runnerStatus === RunnerStatus.SessionTimeout) {
      onUpdate({
        ...data,
        type: 'error',
        message: 'Connection timeout.',
      });
    }

    if (data.runnerStatus === RunnerStatus.SessionStarted) {
      onUpdate({
        ...data,
        type: 'message',
        message: conditional(
          data.runnerClientStatus === RunnerClientStatus.Offline
            ? 'Session started. Waiting for runner client response...'
            : 'Runner client connected. Happy hacking!',
        ),
      });
    }
  }

  // MARK: session control
  async connectTo(data: SessionData): Promise<boolean> {
    this.socket?.disconnect();
    this._data = data;

    return new Promise((resolve) => {
      const socket = io(data.serverAddress);
      const timeoutHandle = setTimeout(() => {
        if (
          this.runnerStatus === RunnerStatus.Disconnected ||
          this.runnerStatus === RunnerStatus.Connected
        ) {
          socket.disconnect();
          this.runnerStatus = RunnerStatus.SessionTimeout;
          resolve(false);
        }
      }, 20000);
      const clearTimeoutHandleIfNeeded = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      };

      this.setPartialRunnerStatusData({
        sessionId: data.sessionId,
        runnerStatus: RunnerStatus.Disconnected,
        runnerClientStatus: RunnerClientStatus.Offline,
      });
      this.socket = socket;
      this.terminals = [];

      socket.on('connect', () => {
        console.log('runner connected');
        socket.emit(VscClientEvent.SetType, this.sessionId);
        this.runnerStatus = RunnerStatus.Connected;
      });

      socket.on('error', (error: unknown) => {
        console.warn('socket returned with error', error);
      });

      socket.on('disconnect', () => {
        console.log('runner disconnected');

        if (this.runnerStatus !== RunnerStatus.SessionTimeout) {
          this.runnerStatus = RunnerStatus.Disconnected;
        }

        clearTimeoutHandleIfNeeded();
      });

      socket.on(RunnerServerEvent.SessionStarted, (sessionId: string) => {
        console.log('received session started event for id', sessionId);

        if (this.sessionId && this.sessionId !== sessionId) {
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

        this.registerSocketEventListeners();
        console.log('session started', sessionId);

        if (this.sessionId) {
          this.retrieveRunnerInfo();
        }

        this.sessionId = sessionId;
        this.runnerStatus = RunnerStatus.SessionStarted;
        this.setPartialRunnerStatusData({
          sessionId,
          runnerStatus: RunnerStatus.SessionStarted,
        });
        setSessionData(this._extensionContext, data.githubRef, { ...data, sessionId });
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
    this.socket?.on(
      RunnerServerEvent.RunnerStatus,
      (runnerClientStatus: RunnerClientStatus, runnerClientOS: SessionOS) => {
        this.setPartialRunnerStatusData({ runnerClientStatus, runnerClientOS });
      },
    );
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
