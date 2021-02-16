import Button from '@/components/Button';
import Description from '@/components/Description';
import Tip from '@/components/Tip';
import Title from '@/components/Title';
import { RepoData, UserContext } from '@src/types/foundation';
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';

import styles from './index.module.scss';

export type Props = {
  userContext?: UserContext;
  repoData?: RepoData;
};

const SourceControl = ({ repoData, userContext }: Props) => {
  const [branchName, setBranchName] = useState('');

  useEffect(() => {
    setBranchName(`${userContext?.login ?? 'github-vsc'}--patch-${dayjs().format(`HHmm`)}`);
  }, [userContext?.login]);

  const hasWritePermission =
    !!repoData?.permission && !['read', 'triage'].includes(repoData.permission.toLowerCase());

  if (!repoData?.ref) {
    return null;
  }

  const { owner, repo, ref } = repoData.ref;

  return (
    <div className={styles.sc}>
      <Title>Source Control</Title>
      <Description>
        {owner} / {repo}
      </Description>
      <Description>You have no changed files on '{ref}'.</Description>
      <div className={styles.subtitle}>Commit Message</div>
      <div className={styles.commit}>
        <input type="text" />
      </div>
      <div className={styles.subtitle}>Branch Name</div>
      <div className={styles.proposeChange}>
        <input
          type="text"
          value={branchName}
          onChange={({ target: { value } }) => setBranchName(value)}
        />
        <Button type="secondary" onClick={() => {}}>
          Propose Changes
        </Button>
      </div>
      {!hasWritePermission && (
        <Tip>
          You’re making changes in a project you don’t have write access to. Submitting a change
          will write it to a new branch in your fork repo, so you can send a pull request. <br />
          If you believe there's no permission issue, please make sure `repo` is in your PAT scopes.
        </Tip>
      )}
    </div>
  );
};

export default SourceControl;
