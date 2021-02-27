import { RunnerClientStatus } from '@github-vsc-runner/core';
import { RunnerStatus } from '@src/extension/remote-session/types';
import { ITerminalDimensions } from 'xterm-addon-fit';
import { CommitMethod } from './foundation';
import { RunnerStatusData } from './session';

export enum WebviewActionEnum {
  RequestData = 'RequestData',
  UpdateData = 'UpdateData',
  ValidatePAT = 'ValidatePAT',
  ValidatePATResult = 'ValidatePATResult',
  CommitChanges = 'CommitChanges',
  CommitChangesMessage = 'CommitChangesMessage',
  CommitChangesResult = 'CommitChangesResult',
  ConnectToRemoteSession = 'ConnectToRemoteSession',
  RemoteSessionData = 'RemoteSessionData',
  RequestRemoteRessionData = 'RequestRemoteRessionData',
  ActivateTerminal = 'ActivateTerminal',
  SetTerminals = 'SetTerminals',
  TerminalStdout = 'TerminalStdout',
  TerminalCmd = 'TerminalCmd',
  TerminalSetDimensions = 'TerminalSetDimensions',
}

export type ProposeChangesPayload = {
  commitMethod: CommitMethod;
  commitMessage: string;
  branchName: string;
};

export type TerminalDimensionsPayload = ITerminalDimensions & {
  id: string;
};

export type RemoteSessionDataPayload = RunnerStatusData & {
  type: 'message' | 'error';
  message?: string;
};

export default interface WebviewAction {
  action: WebviewActionEnum;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any;
}
