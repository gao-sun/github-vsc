import { RepoData, SessionData, UserContext } from '@core/types/foundation';

export type Props = {
  repoData?: RepoData;
  sessionData?: SessionData;
  userContext?: UserContext;
};

export enum SessionMethod {
  StartNew = 'Start',
  Resume = 'Resume',
}

export type SessionOption = {
  value: SessionMethod;
  message: string;
};

export const sessionOptions: readonly SessionOption[] = Object.freeze([
  { value: SessionMethod.StartNew, message: 'Start a new session.' },
  { value: SessionMethod.Resume, message: 'Resume an existing session.' },
]);

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
    address: 'ws://localhost:3000',
    type: RunnerServerType.Dev,
  },
  {
    name: 'Actions Runner (Shanghai)',
    address: 'wss://runner.github-vsc.com',
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
