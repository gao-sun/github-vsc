import Description from '@/components/Description';
import Title from '@/components/Title';
import { UserContext } from '@src/types/foundation';
import React, { useCallback, useEffect, useState } from 'react';

import styles from './index.module.scss';

export type Props = {
  userContext?: UserContext;
};

const RemoteSession = ({ userContext }: Props) => {
  return (
    <div className={styles.remoteSession}>
      <Title>Remote Session</Title>
      <Description>Start a remote session to enable terminal access.</Description>
      <select name="runner-server" id="">
        <option value="localhost">localhost:3000</option>
      </select>
    </div>
  );
};

export default RemoteSession;
