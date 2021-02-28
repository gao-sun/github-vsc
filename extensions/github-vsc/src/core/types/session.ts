import { RunnerClientOS, RunnerClientStatus } from '@github-vsc-runner/core';
import { RunnerStatus } from '@src/extension/remote-session/types';

export type RunnerStatusData = {
  sessionId?: string;
  runnerStatus: RunnerStatus;
  runnerClientStatus: RunnerClientStatus;
  runnerClientOS?: RunnerClientOS;
};
