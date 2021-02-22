import { Disposable } from 'vscode';
import { io, Socket } from 'socket.io-client';
import { VscClientEvent, RunnerServerEvent } from '@github-vsc-runner/core';

export enum RunnerStatus {
  Disconnected,
  Connected,
  SessionStarted,
  SessionTimeout,
  Offline,
}

export class RemoteSession implements Disposable {
  // MARK: disposable
  private readonly disposable: Disposable;
  runnerStatus: RunnerStatus;
  sessionId?: string;
  socket?: Socket;

  constructor() {
    this.runnerStatus = RunnerStatus.Disconnected;
    this.disposable = Disposable.from();
  }

  dispose(): void {
    this.disposable.dispose();
  }

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
      this.socket = socket;
      this.sessionId = sessionId;

      socket.on('connect', () => {
        console.log('runner connected');
        socket.emit(VscClientEvent.SetType, sessionId);
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
        if (sessionId && sessionId !== id) {
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
        this.sessionId = id;
        this.runnerStatus = RunnerStatus.SessionStarted;
        resolve(true);
      });
    });
  }
}
