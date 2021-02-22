import React, { useEffect, useState } from 'react';
import { WebviewActionEnum } from '@src/types/WebviewAction';
import useListenMessage from '@/hooks/useListenMessage';
import { vscodeApi } from '@/utils/vscode';

import PAT from './PAT';
import SourceControl from './SourceControl';
import styles from './index.module.scss';
import { VSCodeData } from '@src/types/foundation';
import RemoteSession from './RemoteSession';

const App = () => {
  const [data, setData] = useState<VSCodeData>();

  useEffect(() => {
    vscodeApi.postMessage({
      action: WebviewActionEnum.RequestData,
    });
  }, []);

  useListenMessage(({ action, payload }) => {
    if (action === WebviewActionEnum.UpdateData) {
      setData(payload);
    }
  });

  return (
    <div className={styles.app}>
      <PAT token={data?.userContext?.pat}></PAT>
      <RemoteSession userContext={data?.userContext}></RemoteSession>
      <SourceControl repoData={data?.repoData} userContext={data?.userContext}></SourceControl>
    </div>
  );
};

export default App;
