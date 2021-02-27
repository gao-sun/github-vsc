import { RunnerClientStatus } from '@github-vsc-runner/core';
import { RunnerStatus } from '@src/extension/remote-session/types';
import { SessionOS } from './foundation';

export type RunnerStatusData = {
  sessionId?: string;
  runnerStatus: RunnerStatus;
  runnerClientStatus: RunnerClientStatus;
  runnerClientOS?: SessionOS;
};
