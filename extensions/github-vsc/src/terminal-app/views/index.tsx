import useListenMessage from '@src/core/hooks/useListenMessage';
import { TerminalData } from '@src/core/types/foundation';
import WebviewAction, { WebviewActionEnum } from '@src/core/types/WebviewAction';
import { vscodeApi } from '@src/core/utils/vscode';
import React, { useCallback, useEffect, useState } from 'react';
import { Terminal } from 'xterm';

import 'xterm/css/xterm.css';
import styles from './index.module.scss';

type TerminalInstance = {
  terminal: Terminal;
  id: string;
};

const App = () => {
  const [instances, setInstances] = useState<TerminalInstance[]>([]);
  const findTerminalById = useCallback(
    (terminalId: string) => {
      return instances.find(({ id }) => id === terminalId)?.terminal;
    },
    [instances],
  );
  const createTerminalIfNotExists = useCallback(
    (id: string): Terminal => {
      const found = findTerminalById(id);
      if (found) {
        return found;
      }
      const terminal = new Terminal();

      terminal.onData((data) => {
        const action: WebviewAction = {
          action: WebviewActionEnum.TerminalCmd,
          payload: { terminalId: id, data },
        };
        vscodeApi.postMessage(action);
      });
      return terminal;
    },
    [findTerminalById],
  );

  useEffect(() => {
    vscodeApi.postMessage({ action: WebviewActionEnum.RequestData });
  }, []);

  useListenMessage(({ action, payload }: WebviewAction) => {
    if (action === WebviewActionEnum.SetTerminals) {
      const ids = payload as string[];
      setInstances(ids.map((id) => ({ id, terminal: createTerminalIfNotExists(id) })));
    }

    if (action === WebviewActionEnum.TerminalStdout) {
      const { terminalId, data } = payload as TerminalData;
      findTerminalById(terminalId)?.write(data);
    }
  });

  return (
    <div className={styles.app}>
      {instances.map(({ id, terminal }) => (
        <div
          key={id}
          ref={(dom) => {
            if (dom) {
              terminal.open(dom);
            }
          }}
        ></div>
      ))}
    </div>
  );
};

export default App;
