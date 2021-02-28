import { RunnerClientOS } from '@github-vsc-runner/core';
import { GitHubRef } from '@src/core/types/foundation';
import dayjs from 'dayjs';
import { createFork, dispatchRunnerWorkflow, isForkReady } from '../apis';
import { wait } from '../utils/wait';

const runnerRef: GitHubRef = {
  owner: 'gao-sun',
  repo: 'github-vsc-runner',
  ref: 'heads/master',
};

export type MessageDelivery = (
  message: string,
  type?: 'message' | 'error',
  workflowRef?: GitHubRef,
) => void;

export const forkRunnerRepo = async (
  deliverMessage: MessageDelivery,
): Promise<[string, string]> => {
  const { owner, repo } = runnerRef;
  deliverMessage(`Forking ${owner}/${repo}...`);

  const {
    data: { full_name },
  } = await createFork(owner, repo);
  const [forkOwner, forkRepo] = full_name.split('/');

  const startTime = dayjs();

  while (!(await isForkReady(forkOwner, forkRepo))) {
    if (dayjs().diff(startTime, 'seconds') >= 30) {
      throw new Error(
        `Forking ${owner}/${repo} took too long. Please contact GitHub support if needed.`,
      );
    }
    await wait(1000);
  }

  return [forkOwner, forkRepo];
};

export const launchRunnerClient = async (
  deliverMessage: MessageDelivery,
  serverAddress: string,
  os: RunnerClientOS,
  sessionId: string,
): Promise<boolean> => {
  try {
    const [owner, repo] = await forkRunnerRepo(deliverMessage);
    const ref = 'refs/heads/master';

    deliverMessage(`Launching workflow for runner client...`);
    await dispatchRunnerWorkflow(owner, repo, ref, serverAddress, os, sessionId);
    deliverMessage('Workflow dispatched, waiting for runner response...', 'message', {
      owner,
      repo,
      ref,
    });
  } catch (error) {
    console.warn('unable to launch runner client', error);
    return false;
  }

  return true;
};
