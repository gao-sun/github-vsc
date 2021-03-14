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
import logger from '@src/core/utils/logger';

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

export const setupRunnerClientRepo = async (
  extensionContext: ExtensionContext,
  deliverMessage: MessageDelivery,
): Promise<[Optional<string>, Optional<string>]> => {
  try {
    const [owner, repo] = await forkRunnerRepo(deliverMessage);
    await setupRepoPAT(extensionContext, deliverMessage, owner, repo);
    return [owner, repo];
  } catch (error) {
    deliverMessage(`Setup runner client repo failed: ${error.toString()}`, 'error');
    logger.warn('unable to setup runner client repo', JSON.stringify(error, undefined, 2));
  }

  return [undefined, undefined];
};

export const dispatchRunnerClientWorkflow = async (
  deliverMessage: MessageDelivery,
  serverAddress: string,
  os: RunnerClientOS,
  sessionId: string,
  githubRef: GitHubRef,
  runnerClientRef: GitHubRef,
  onTimeoutUpdate: (timeout: ReturnType<typeof setTimeout>) => void,
): Promise<boolean> => {
  deliverMessage('Dispatching workflow for runner client...');

  const dispatch = () =>
    new Promise<boolean>((resolve) => {
      const _dispatch = async () => {
        try {
          await dispatchRunnerWorkflow(
            runnerClientRef.owner,
            runnerClientRef.repo,
            runnerClientRef.ref,
            serverAddress,
            os,
            sessionId,
            `${githubRef.owner}/${githubRef.repo}`,
            githubRef.ref,
          );
          resolve(true);
        } catch (error) {
          // I know this is stupid, but they don't care about this
          // https://github.community/t/how-to-run-and-enable-github-actions-on-forked-repo-with-github-api/17232
          if (error.status === 404) {
            deliverMessage(
              'Unable to dispatch workflow. If this is your first try you need to manually enable workflow runs on the forked repo.',
              'error',
              runnerClientRef,
            );
            onTimeoutUpdate(setTimeout(_dispatch, 2500));
            return;
          }
          throw error;
        }
      };

      _dispatch();
    });

  try {
    await dispatch();
  } catch (error) {
    deliverMessage(`Dispatch runner client workflow failed: ${error.toString()}`, 'error');
    logger.warn('unable to dispatch runner client workflow', JSON.stringify(error, undefined, 2));
  }

  deliverMessage('Workflow dispatched, waiting for runner response...', 'message', runnerClientRef);
  return true;
};
