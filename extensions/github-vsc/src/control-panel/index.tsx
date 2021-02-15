import 'regenerator-runtime/runtime';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import PAT from './controls/PAT';
import { WebviewActionEnum } from '@src/types/WebviewAction';
import useListenMessage from './hooks/useListenMessage';
import { vscodeApi } from './utils/vscode';

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
    <div>
      <PAT token={data?.pat}></PAT>
    </div>
  );
};

ReactDOM.render(<App />, document.querySelector('#root'));

export default App;
