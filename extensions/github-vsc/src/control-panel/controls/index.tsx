import React, { useEffect, useState } from 'react';
import { WebviewActionEnum } from '@src/core/types/webview-action';
import useListenMessage from '@core/hooks/useListenMessage';
import { vscodeApi } from '@core/utils/vscode';
import { getRefKey } from '@core/utils/git-ref';

import PAT from './PAT';
import SourceControl from './SourceControl';
import styles from './index.module.scss';
import { VSCodeData } from '@core/types/foundation';
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

  const sessionData = data?.repoData?.ref && data.sessionDict[getRefKey(data.repoData.ref)];

  return (
    <div className={styles.app}>
      <PAT token={data?.userContext?.pat}></PAT>
      <RemoteSession repoData={data?.repoData} sessionData={sessionData}></RemoteSession>
      <SourceControl repoData={data?.repoData} userContext={data?.userContext}></SourceControl>
    </div>
  );
};

export default App;
