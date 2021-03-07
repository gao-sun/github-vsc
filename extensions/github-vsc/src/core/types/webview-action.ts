import { ITerminalDimensions } from 'xterm-addon-fit';
import { CommitMethod, GitHubRef } from './foundation';
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
  RequestRemoteSessionData = 'RequestRemoteSessionData',
  DisconnectRemoteRession = 'DisconnectRemoteRession',
  TerminateRemoteRession = 'TerminateRemoteRession',
  ActivateTerminal = 'ActivateTerminal',
  SetTerminals = 'SetTerminals',
  TerminalStdout = 'TerminalStdout',
  TerminalCmd = 'TerminalCmd',
  TerminalSetDimensions = 'TerminalSetDimensions',
  SetPortForwarding = 'SetPortForwarding',
}

export type ProposeChangesPayload = {
  commitMethod: CommitMethod;
  commitMessage: string;
  branchName: string;
};

export type ActivateTerminalPayload = {
  shell: string;
};

export type TerminalDimensionsPayload = ITerminalDimensions & {
  id: string;
};

export type RemoteSessionDataPayload = RunnerStatusData & {
  type: 'message' | 'error';
  message?: string;
  workflowRef?: GitHubRef;
};

export default interface WebviewAction {
  action: WebviewActionEnum;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any;
}
