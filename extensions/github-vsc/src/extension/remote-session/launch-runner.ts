import { RunnerClientOS } from '@github-vsc-runner/core';
import { GitHubRef } from '@src/core/types/foundation';
import dayjs from 'dayjs';
import { Buffer } from 'buffer/';
import sealedBox from 'tweetnacl-sealedbox-js';
import {
  createFork,
  dispatchRunnerWorkflow,
  getActionsPublicKey,
  isForkReady,
  updateActionsRepoSecret,
} from '../apis';
import { wait } from '../utils/wait';
import { getVSCodeData } from '../utils/global-state';
import { ExtensionContext } from 'vscode';

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

const setupRepoPAT = async (
  extensionContext: ExtensionContext,
  deliverMessage: MessageDelivery,
  owner: string,
  repo: string,
) => {
  deliverMessage(`Setting up PAT for ${owner}/${repo}...`);
  const {
    data: { key_id, key },
  } = await getActionsPublicKey(owner, repo);

  const value = getVSCodeData(extensionContext)?.userContext?.pat;
  const messageBytes = Buffer.from(value ?? '');
  const keyBytes = Buffer.from(key, 'base64');
  const encryptedBytes = sealedBox.seal(messageBytes, keyBytes);
  const encrypted = Buffer.from(encryptedBytes).toString('base64');

  await updateActionsRepoSecret(owner, repo, 'RUNNER_ACTIONS_PAT', encrypted, key_id);
};

export const launchRunnerClient = async (
  extensionContext: ExtensionContext,
  deliverMessage: MessageDelivery,
  serverAddress: string,
  os: RunnerClientOS,
  sessionId: string,
  githubRef: GitHubRef,
): Promise<boolean> => {
  try {
    const [owner, repo] = await forkRunnerRepo(deliverMessage);
    const ref = 'refs/heads/master';

    await setupRepoPAT(extensionContext, deliverMessage, owner, repo);
    deliverMessage('Launching workflow for runner client...');
    await dispatchRunnerWorkflow(
      owner,
      repo,
      ref,
      serverAddress,
      os,
      sessionId,
      `${githubRef.owner}/${githubRef.repo}`,
      githubRef.ref,
    );
    deliverMessage('Workflow dispatched, waiting for runner response...', 'message', {
      owner,
      repo,
      ref,
    });
  } catch (error) {
    deliverMessage(`Launch runner client failed: ${error.toString()}`, 'error');
    console.warn('unable to launch runner client', error);
    return false;
  }

  return true;
};
