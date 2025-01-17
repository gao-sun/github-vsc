import Button from '@/components/Button';
import Description from '@/components/Description';
import Tip from '@/components/Tip';
import Title from '@/components/Title';
import { CommitMethod, RepoData, SessionData, UserContext } from '@core/types/foundation';
import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';

import styles from './index.module.scss';
import { vscodeApi } from '@core/utils/vscode';
import WebViewAction, {
  ProposeChangesPayload,
  RemoteSessionDataPayload,
  WebviewActionEnum,
} from '@src/core/types/webview-action';
import { conditionalString } from '@src/extension/utils/object';
import { getFileName } from '@core/utils/path';
import useListenMessage from '@core/hooks/useListenMessage';
import RadioGroup from '@/components/RadioGroup';
import { getNormalRef } from '@src/core/utils/git-ref';
import { RunnerStatus } from '@src/extension/remote-session/types';

type CommitOption = {
  value: CommitMethod;
  message: string;
  defaulCheck?: boolean;
};

export type Props = {
  userContext?: UserContext;
  repoData?: RepoData;
};

const SourceControl = ({ repoData, userContext }: Props) => {
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [commitMethod, setCommitMethod] = useState<CommitMethod>(CommitMethod.PR);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const hasWritePermission =
    !!repoData?.permission && !['read', 'triage'].includes(repoData.permission.toLowerCase());
  const hasToken = !!userContext?.pat;
  const isShowingMessage = !!(loading || message || error);

  const updateBranchName = useCallback(() => {
    setBranchName(`${userContext?.login ?? 'github-vsc'}--patch-${dayjs().format(`HHmm`)}`);
  }, [userContext?.login]);

  useEffect(() => {
    updateBranchName();
  }, [updateBranchName]);

  useEffect(() => {
    if (hasWritePermission) {
      setCommitMethod(CommitMethod.PR);
    } else {
      setCommitMethod(CommitMethod.Fork);
    }
  }, [hasWritePermission]);

  useEffect(() => {
    if (!!repoData?.changedFiles.length) {
      setCommitMessage(
        repoData.commitMessage ||
          (repoData.changedFiles.length > 1
            ? 'Update files'
            : `Update ${getFileName(repoData.changedFiles[0])}`),
      );
    }
  }, [repoData?.changedFiles, repoData?.commitMessage]);

  useListenMessage(({ action, payload }) => {
    if (action === WebviewActionEnum.CommitChangesResult) {
      setLoading(false);
      if (payload.success) {
        setMessage('Committed sucessfully.');
      } else {
        setError(payload?.message ?? 'Committing changes failed.');
      }
    }

    if (action === WebviewActionEnum.CommitChangesMessage) {
      setMessage(String(payload));
    }

    if (action === WebviewActionEnum.RemoteSessionData) {
      const { runnerStatus } = payload as RemoteSessionDataPayload;
      // TO-DO: make this check an util
      setHasActiveSession(
        [RunnerStatus.Connecting, RunnerStatus.Connected, RunnerStatus.SessionStarted].includes(
          runnerStatus,
        ),
      );
    }
  });

  const commit = () => {
    const payload: ProposeChangesPayload = {
      commitMessage,
      branchName: conditionalString(commitMethod !== CommitMethod.Commit && branchName),
      commitMethod,
    };
    const action: WebViewAction = {
      action: WebviewActionEnum.CommitChanges,
      payload: payload,
    };

    setMessage('');
    setError('');
    setLoading(true);

    vscodeApi.postMessage(action);
  };

  if (!repoData?.ref) {
    return null;
  }

  const {
    ref: { owner, repo, ref },
    changedFiles,
  } = repoData;
  const commitOptions: CommitOption[] = hasWritePermission
    ? [
        { value: CommitMethod.Commit, message: `Commit to '${ref}' directly.` },
        {
          value: CommitMethod.PR,
          message: `Create a new branch for this commit and start a pull request.`,
        },
      ]
    : [
        {
          value: CommitMethod.Fork,
          message: `Fork the repo, create a new branch for this commit and start a pull request.`,
        },
      ];

  if (hasActiveSession) {
    return (
      <div className={styles.sc}>
        <Title>Source Control</Title>
        <Description>Editor source control is disabled when remote session is active.</Description>
      </div>
    );
  }

  return (
    <div className={styles.sc}>
      <Title>Source Control</Title>
      <Description>
        {owner} / {repo}
      </Description>
      {!changedFiles.length && (
        <Description>
          {`You have no changed files on '${getNormalRef(ref)}'.`}
          <br />
          Changes are required to start committing.
        </Description>
      )}
      {!!changedFiles.length && (
        <Description>
          {`You have ${changedFiles.length} changed file${conditionalString(
            changedFiles.length > 1 && 's',
          )} on '${ref}'.`}
          {!hasToken && ' Setup PAT to commit those changes.'}
        </Description>
      )}
      {hasToken && !!changedFiles.length && (
        <>
          <div className={styles.subtitle}>Commit Message</div>
          <div className={styles.commit}>
            <input
              disabled={loading}
              type="text"
              value={commitMessage}
              onChange={({ target: { value } }) => setCommitMessage(value)}
            />
          </div>
          <div className={styles.subtitle}>Commit Method</div>
          <RadioGroup
            options={commitOptions}
            onChange={setCommitMethod}
            name="change-type"
            value={commitMethod}
            disabled={loading}
          />
          {commitMethod !== CommitMethod.Commit && (
            <>
              <div className={styles.subtitle}>Branch Name</div>
              <div className={styles.proposeChange}>
                <input
                  disabled={loading}
                  type="text"
                  value={branchName}
                  onChange={({ target: { value } }) => {
                    setError('');
                    setBranchName(value);
                  }}
                />
                <Button disabled={loading} type="secondary" onClick={commit}>
                  Propose Changes
                </Button>
              </div>
            </>
          )}
          {commitMethod === CommitMethod.Commit && (
            <Button disabled={loading} type="secondary" onClick={commit}>
              Commit Changes
            </Button>
          )}
          {!isShowingMessage && !hasWritePermission && (
            <Tip>
              You’re making changes in a project you don’t have write access to. Submitting a change
              will write it to a new branch in your fork repo, so you can send a pull request.
              <br />
              If you believe there’s no permission issue, please make sure `repo` is in your PAT
              scopes.
            </Tip>
          )}
        </>
      )}
      {error && <Tip type="warning">{error}</Tip>}
      {(loading || message) && !error && <Tip>{message || 'Submitting...'}</Tip>}
    </div>
  );
};

export default SourceControl;
