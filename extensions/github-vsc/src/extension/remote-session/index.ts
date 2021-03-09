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
  RunnerClientOS,
} from '@github-vsc-runner/core';
import { nanoid } from 'nanoid';

import { TerminalData } from '@core/types/foundation';
import configureWebview from '../utils/configure-webview';
import WebviewAction, {
  ActivateTerminalPayload,
  RemoteSessionDataPayload,
  TerminalDimensionsPayload,
  WebviewActionEnum,
} from '@src/core/types/webview-action';
import { SessionData } from '@src/core/types/foundation';
import { RunnerStatus } from './types';
import { conditional } from '../utils/object';
import { RunnerStatusData, allRunners, RunnerServerType } from '@src/core/types/session';
import { getSessionData, setSessionData } from '../utils/global-state';
import dayjs, { Dayjs } from 'dayjs';
import { getRefKey } from '@src/core/utils/git-ref';
import { launchRunnerClient, MessageDelivery } from './launch-runner';
import { RemoteSessionFS } from './fs';
import { reopenFolder } from '../utils/workspace';
import logger from '@src/core/utils/logger';

type TerminalInstance = TerminalOptions & {
  activateTime: Dayjs;
  restoredFromRemote: boolean;
};

const terminalLiveThreshold = 3;

export class RemoteSession implements Disposable {
  // MARK: disposable
  private readonly _disposable: Disposable;
  private readonly _extensionContext: ExtensionContext;
  private _panel?: WebviewPanel;
  private _data?: SessionData;
  private _terminals: TerminalInstance[];
  private _onUpdate: (payload: RemoteSessionDataPayload) => void;
  private _onPortForwardingUpdate: (port?: number) => void;
  private _onDisconnect: () => void;
  private _runnerStatusData: RunnerStatusData = {
    runnerStatus: RunnerStatus.Initial,
    runnerClientStatus: RunnerClientStatus.Offline,
  };
  socket?: Socket;
  fileSystem = new RemoteSessionFS();

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

  set terminals(terminals: TerminalInstance[]) {
    this._terminals = terminals;
    this.setupPanelIfNeeded();
    this.postTerminalsToWebview();
  }

  get terminals(): TerminalInstance[] {
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

  private resetRunnerStatus(runnerStatus = RunnerStatus.Initial) {
    this.setPartialRunnerStatusData({
      sessionId: undefined,
      runnerStatus,
      runnerClientStatus: RunnerClientStatus.Offline,
      runnerClientOS: undefined,
    });
  }

  constructor(
    extensionContext: ExtensionContext,
    onUpdate: (payload: RemoteSessionDataPayload) => void,
    onPortForwardingUpdate: (port?: number) => void,
    onDisconnect: () => void,
  ) {
    this._extensionContext = extensionContext;
    this._onUpdate = onUpdate;
    this._onPortForwardingUpdate = onPortForwardingUpdate;
    this._onDisconnect = onDisconnect;
    this._terminals = [];
    this._disposable = Disposable.from(this.fileSystem);
  }

  dispose(): void {
    this._disposable.dispose();
  }

  // MARK: webview message
  deliverStatusData(): void {
    const { runnerStatusData: data, _onUpdate: onUpdate } = this;

    if (data.runnerStatus === RunnerStatus.Connected) {
      onUpdate({
        ...data,
        type: 'message',
        message: `Runner conncted. ${
          this.sessionId ? `Resuming session ${this.sessionId}` : 'Reuqesting new session'
        }...`,
      });
    }

    if ([RunnerStatus.Initial, RunnerStatus.Connecting].includes(data.runnerStatus)) {
      onUpdate({ ...data, type: 'message' });
    }

    if (data.runnerStatus === RunnerStatus.SessionTimeout) {
      onUpdate({
        ...data,
        type: 'error',
        message: 'Connection timeout. Please try another runner.',
      });
    }

    if (data.runnerStatus === RunnerStatus.SessionTerminated) {
      onUpdate({
        ...data,
        type: 'error',
        message: 'Session has been terminated, please create a new one if needed.',
      });
    }

    if (data.runnerStatus === RunnerStatus.Disconnected) {
      onUpdate({
        ...data,
        type: 'error',
        message:
          'Runner server disconnected, this may infer an upgrade/maintenance. Please try to connect later.',
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

  deliverPortForwardingData(): void {
    const { runnerStatus, runnerClientStatus, _onPortForwardingUpdate: onUpdate } = this;

    if (
      !(
        runnerStatus === RunnerStatus.SessionStarted &&
        runnerClientStatus === RunnerClientStatus.Online
      )
    ) {
      onUpdate();
      return;
    }

    this.socket?.emit(VscClientEvent.FetchCurrentPortForwarding);
  }

  // MARK: setup runner client
  private async launchRunnerClient() {
    // skip non GitHub Actions client
    // support customization in the future, if this project gets a lot of stars :-)
    if (
      allRunners.find(({ address }) => this._data?.serverAddress === address)?.type !==
      RunnerServerType.GitHubActions
    ) {
      return;
    }

    const postNoDataMessage = () =>
      this._onUpdate({
        ...this.runnerStatusData,
        type: 'error',
        message: 'No sufficient data to launch runner client, please check your inputs.',
      });

    if (!this._data) {
      postNoDataMessage();
      return;
    }

    const { githubRef, os, serverAddress, sessionId } = this._data;
    if (!githubRef || !os || !serverAddress || !sessionId) {
      postNoDataMessage();
      return;
    }

    const deliverMessage: MessageDelivery = (message, type = 'message', workflowRef) => {
      this._onUpdate({ ...this.runnerStatusData, type, message, workflowRef });
    };
    await launchRunnerClient(
      this._extensionContext,
      deliverMessage,
      serverAddress,
      os,
      sessionId,
      githubRef,
    );
  }

  // MARK: session control
  async connectTo(data: SessionData): Promise<boolean> {
    const existingSession = getSessionData(this._extensionContext, data.githubRef);
    if (existingSession?.sessionId && existingSession.sessionId !== data.sessionId) {
      const answer = await vsCodeWindow.showInformationMessage(
        `A session for ${getRefKey(data.githubRef)} already exists (${
          existingSession.sessionId
        }).\nIt will NOT be terminated until you cancel your GitHub Actions workflow or manually terminate after resuming the session here.\n\nContinue to create a new session?`,
        { modal: true },
        'Continue',
      );
      if (answer !== 'Continue') {
        this.runnerStatus = RunnerStatus.Initial;
        return false;
      }
    }

    this.socket?.disconnect();
    this._data = data;

    return new Promise((resolve) => {
      const socket = io(data.serverAddress);
      const timeoutHandle = setTimeout(() => {
        if (
          [RunnerStatus.Initial, RunnerStatus.Connected, RunnerStatus.Connecting].includes(
            this.runnerStatus,
          )
        ) {
          socket.disconnect();
          this.resetRunnerStatus(RunnerStatus.SessionTimeout);
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
        runnerStatus: RunnerStatus.Connecting,
        runnerClientStatus: RunnerClientStatus.Offline,
      });
      this.socket = socket;
      this.terminals = [];

      socket.on('connect', () => {
        logger.info('runner connected');
        socket.emit(VscClientEvent.SetType, this.sessionId);
        this.runnerStatus = RunnerStatus.Connected;
      });

      socket.on('error', (error: unknown) => {
        logger.warn('socket returned with error', error);
      });

      socket.on('disconnect', () => {
        logger.info('runner disconnected');

        this.terminals = [];
        this.socket = undefined;
        if ([RunnerStatus.Connected, RunnerStatus.SessionStarted].includes(this.runnerStatus)) {
          this.resetRunnerStatus(RunnerStatus.Disconnected);
        }

        clearTimeoutHandleIfNeeded();
        this._onDisconnect();

        // TO-DO: remove this line to re-connect runner automatically
        socket.close();
      });

      socket.on(RunnerServerEvent.SessionTerminated, () => {
        clearTimeoutHandleIfNeeded();
        socket.disconnect();
        this.resetRunnerStatus(RunnerStatus.SessionTerminated);
        setSessionData(this._extensionContext, data.githubRef, undefined);
      });

      socket.on(RunnerServerEvent.SessionStarted, (sessionId: string) => {
        logger.debug('received session started event for id', sessionId);

        if (this.sessionId && this.sessionId !== sessionId) {
          logger.warn("session id doesn't match, skipping");
          return;
        }

        if (this.runnerStatus !== RunnerStatus.Connected) {
          logger.warn(
            `runner status not correct, expect ${RunnerStatus.Connected}, found ${this.runnerStatus}, skipping`,
          );
          return;
        }

        clearTimeoutHandleIfNeeded();

        this.registerSocketEventListeners(socket);
        logger.info('session started', sessionId);

        this.runnerStatus = RunnerStatus.SessionStarted;
        this.setPartialRunnerStatusData({
          sessionId,
          runnerStatus: RunnerStatus.SessionStarted,
        });
        this._onPortForwardingUpdate();
        setSessionData(this._extensionContext, data.githubRef, { ...data, sessionId });

        const isNewSession = !!this.sessionId;
        this.sessionId = sessionId;

        if (isNewSession) {
          this.retrieveRunnerInfo();
        } else {
          this.launchRunnerClient();
        }
        resolve(true);
      });
    });
  }

  disconnect(): void {
    this.resetRunnerStatus(RunnerStatus.Initial);
    this.socket?.disconnect();
    this.sessionId = undefined;
  }

  async terminate(): Promise<boolean> {
    const answer = await vsCodeWindow.showWarningMessage(
      `Runner client for ${getRefKey(
        this._data?.githubRef,
      )} will be terminated and all un-pushed changes will be discarded. Continue?`,
      { modal: true },
      'OK',
    );

    if (answer === 'OK') {
      setSessionData(this._extensionContext, this._data?.githubRef, undefined);
      this.socket?.emit(VscClientEvent.TerminateSession);
      this.disconnect();
      return true;
    }

    return false;
  }

  private registerSocketEventListeners(socket: Socket) {
    socket.on(RunnerClientEvent.CurrentTerminals, (terminals: TerminalOptions[]) => {
      logger.debug('received current terminals', terminals);
      this.terminals = terminals.map((terminal) => ({
        ...terminal,
        activateTime: dayjs(),
        restoredFromRemote: true,
      }));
    });
    socket.on(RunnerClientEvent.CurrentPortForwarding, (port?: number) => {
      logger.debug('received port forwarding', port);
      this._onPortForwardingUpdate(port);
    });
    socket.on(RunnerClientEvent.TerminalClosed, (terminalId: string) => {
      if (
        (this.terminals.find(({ id }) => id === terminalId)?.activateTime.diff(dayjs(), 'second') ??
          0) >= -terminalLiveThreshold
      ) {
        vsCodeWindow.showWarningMessage(
          `Terminal closed in ${terminalLiveThreshold} seconds, this may indicates an error. Please make sure the shell file exists in the runner client OS.`,
        );
      }

      this.terminals = this.terminals.filter(({ id }) => id !== terminalId);
    });
    socket.on(RunnerClientEvent.Stdout, (terminalId: string, data: unknown) => {
      logger.debug('stdout', terminalId, data);
      this.postTerminalData(terminalId, data);
    });
    socket.on(
      RunnerServerEvent.RunnerStatus,
      (runnerClientStatus: RunnerClientStatus, runnerClientOS: RunnerClientOS) => {
        this.setPartialRunnerStatusData({ runnerClientStatus, runnerClientOS });
        if (runnerClientStatus === RunnerClientStatus.Online) {
          this.fileSystem.registerFSEventHandlers(socket);
          reopenFolder('Remote Session', RemoteSessionFS.rootUri);
        }
      },
    );
  }

  private handleAction = ({ action, payload }: WebviewAction) => {
    if (action === WebviewActionEnum.RequestData) {
      this.postTerminalsToWebview();
    }

    if (action === WebviewActionEnum.TerminalCmd) {
      const { terminalId, data } = payload as TerminalData;
      logger.debug('on input', terminalId, data);
      this.socket?.emit(VscClientEvent.Cmd, terminalId, data);
    }

    if (action === WebviewActionEnum.ActivateTerminal) {
      const { shell } = payload as ActivateTerminalPayload;
      this.activateTerminal(shell);
    }

    if (action === WebviewActionEnum.TerminalSetDimensions) {
      const { id, rows, cols } = payload as TerminalDimensionsPayload;
      this.socket?.emit(VscClientEvent.SetTerminalDimensions, id, { rows, cols });
    }
  };

  private retrieveRunnerInfo() {
    this.socket?.emit(VscClientEvent.CheckRunnerStatus);
    this.socket?.emit(VscClientEvent.FetchCurrentTerminals);
    this.socket?.emit(VscClientEvent.FetchCurrentPortForwarding);
  }

  // MARK: port forwarding
  setPortForwarding(port?: number): void {
    this.socket?.emit(VscClientEvent.SetPortForwarding, port);
  }

  // MARK: terminal
  private postTerminalData(terminalId: string, data: unknown) {
    const action = {
      action: WebviewActionEnum.TerminalStdout,
      payload: { terminalId, data },
    };
    this._panel?.webview.postMessage(action);
  }

  private postTerminalsToWebview() {
    const action: WebviewAction = {
      action: WebviewActionEnum.SetTerminals,
      payload: this.terminals,
    };
    this._panel?.webview.postMessage(action);
  }

  activateTerminal(file: string, ignoreIfExists = false): boolean {
    if (this.runnerClientStatus === RunnerClientStatus.Offline) {
      return false;
    }

    if (!ignoreIfExists || !this.terminals.length) {
      const options: TerminalInstance = {
        id: nanoid(),
        file,
        cols: 80,
        rows: 30,
        activateTime: dayjs(),
        restoredFromRemote: false,
      };
      this.terminals = this.terminals.concat(options);
      this.socket?.emit(VscClientEvent.ActivateTerminal, options);
    }
    return true;
  }

  activateTerminalIfNeeded(file: string): boolean {
    return this.activateTerminal(file, true);
  }

  // MARK: panel
  revealPanel(): void {
    if (this._panel) {
      if (!this._panel.visible) {
        this._panel.reveal();
      }
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

  private setupPanelIfNeeded() {
    if (!this.terminals.length) {
      this._panel?.dispose();
      this._panel = undefined;
    } else {
      this.revealPanel();
    }
  }
}
