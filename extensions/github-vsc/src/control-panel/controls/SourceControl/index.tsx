import Button from '@/components/Button';
import Description from '@/components/Description';
import Title from '@/components/Title';
import React from 'react';

import styles from './index.module.scss';

const SourceControl = () => {
  return (
    <div className={styles.sc}>
      <Title>Source Control</Title>
      <Description>gao-sun / eul</Description>
      <Description>You have no changed files on 'dev' branch.</Description>
      <div className={styles.commit}>
        <input type="text" placeholder="Commit message" />
        <Button type="secondary" onClick={() => {}}>
          Propose Changes
        </Button>
      </div>
    </div>
  );
};

export default SourceControl;
