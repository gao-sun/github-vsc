import React from 'react';

import Button from '@/components/Button';
import Description from '@/components/Description';
import Title from '@/components/Title';
import { vscodeApi } from '@core/utils/vscode';
import { UserContext } from '@core/types/foundation';
import { WebviewActionEnum } from '@core/types/WebviewAction';

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
      <Button
        onClick={() => vscodeApi.postMessage({ action: WebviewActionEnum.ConnectToRemoteSession })}
      >
        Start Session
      </Button>
      <Button onClick={() => vscodeApi.postMessage({ action: WebviewActionEnum.ActivateTerminal })}>
        Activate Terminal
      </Button>
    </div>
  );
};

export default RemoteSession;
