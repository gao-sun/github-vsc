import Button from '@/components/Button';
import Description from '@/components/Description';
import Tip from '@/components/Tip';
import Title from '@/components/Title';
import { CommitMethod, RepoData, UserContext } from '@src/types/foundation';
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';

import styles from './index.module.scss';
import { vscodeApi } from '@/utils/vscode';
import WebViewAction, { ProposeChangesPayload, WebviewActionEnum } from '@src/types/WebviewAction';
import { conditionalString } from '@src/extension/utils/object';

type CommitOption = {
  method: CommitMethod;
  message: string;
  defaulCheck?: boolean;
};

export type Props = {
  userContext?: UserContext;
  repoData?: RepoData;
};

const SourceControl = ({ repoData, userContext }: Props) => {
  const [branchName, setBranchName] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [commitMethod, setCommitMethod] = useState<CommitMethod>(CommitMethod.PR);

  const hasWritePermission =
    !!repoData?.permission && !['read', 'triage'].includes(repoData.permission.toLowerCase());

  useEffect(() => {
    setBranchName(`${userContext?.login ?? 'github-vsc'}--patch-${dayjs().format(`HHmm`)}`);
  }, [userContext?.login]);

  useEffect(() => {
    if (hasWritePermission) {
      setCommitMethod(CommitMethod.PR);
    } else {
      setCommitMethod(CommitMethod.Fork);
    }
  }, [hasWritePermission]);

  const propose = () => {
    const payload: ProposeChangesPayload = {
      commitMessage,
      branchName,
    };
    const action: WebViewAction = {
      action: WebviewActionEnum.ProposeChanges,
      payload: payload,
    };

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
        { method: CommitMethod.Commit, message: `Commit to '${ref}' directly.` },
        {
          method: CommitMethod.PR,
          message: `Create a new branch for this commit and start a pull request.`,
        },
      ]
    : [
        {
          method: CommitMethod.Fork,
          message: `Fork the repo, create a new branch for this commit and start a pull request.`,
        },
      ];

  return (
    <div className={styles.sc}>
      <Title>Source Control</Title>
      <Description>
        {owner} / {repo}
      </Description>
      {!changedFiles.length && (
        <Description>
          {`You have no changed files on '${ref}'.`}
          <br />
          Changes are required to start committing.
        </Description>
      )}
      {!!changedFiles.length && (
        <>
          <Description>{`You have ${changedFiles.length} changed file${conditionalString(
            changedFiles.length > 1 && 's',
          )} on '${ref}'.`}</Description>
          <div className={styles.subtitle}>Commit Message</div>
          <div className={styles.commit}>
            <input
              type="text"
              value={commitMessage}
              onChange={({ target: { value } }) => setCommitMessage(value)}
            />
          </div>
          <div className={styles.subtitle}>Commit Method</div>
          <div className={styles.commitMethod}>
            {commitOptions.map(({ method, message }) => (
              <div key={method} className={styles.option}>
                <input
                  type="radio"
                  name="change-type"
                  id={`change-type-${method}`}
                  checked={commitMethod === method}
                  onChange={({ target: { value } }) => {
                    if (value === 'on') {
                      setCommitMethod(method);
                    }
                  }}
                />
                <label htmlFor={`change-type-${method}`}>{message}</label>
              </div>
            ))}
          </div>
          {commitMethod !== CommitMethod.Commit && (
            <>
              <div className={styles.subtitle}>Branch Name</div>
              <div className={styles.proposeChange}>
                <input
                  type="text"
                  value={branchName}
                  onChange={({ target: { value } }) => setBranchName(value)}
                />
                <Button type="secondary" onClick={propose}>
                  Propose Changes
                </Button>
              </div>
            </>
          )}
          {!hasWritePermission && (
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
    </div>
  );
};

export default SourceControl;
