import { RunnerClientOS, RunnerClientStatus } from '@github-vsc-runner/core';
import { RunnerStatus } from '@src/extension/remote-session/types';

export type RunnerStatusData = {
  sessionId?: string;
  runnerStatus: RunnerStatus;
  runnerClientStatus: RunnerClientStatus;
  runnerClientOS?: RunnerClientOS;
};

export enum RunnerServerType {
  Dev = 'Dev',
  GitHubActions = 'GitHubActions',
}

export type RunnerServer = {
  name: string;
  address: string;
  type: RunnerServerType;
};

export const allRunners: readonly RunnerServer[] = Object.freeze([
  {
    name: 'localhost',
    address: 'wss://runner.github-vsc.localhost:3000',
    type: RunnerServerType.Dev,
  },
  {
    name: 'Actions Runner (Japan)',
    address: 'wss://runner-jp.github-vsc.com:3000',
    type: RunnerServerType.GitHubActions,
  },
  {
    name: 'Actions Runner (Silicon Valley)',
    address: 'wss://runner-ca.github-vsc.com',
    type: RunnerServerType.GitHubActions,
  },
]);

export const availableRunners = IS_DEV
  ? allRunners
  : allRunners.filter(({ type }) => type !== RunnerServerType.Dev);
