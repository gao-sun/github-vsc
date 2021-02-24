import useListenMessage from '@src/core/hooks/useListenMessage';
import { TerminalData } from '@src/core/types/foundation';
import WebviewAction, { WebviewActionEnum } from '@src/core/types/WebviewAction';
import { vscodeApi } from '@src/core/utils/vscode';
import React, { useCallback, useEffect, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

import 'xterm/css/xterm.css';
import TerminalIcon from '../icons/Terminal';
import styles from './index.module.scss';
import TerminalView from './TerminalView';

type TerminalInstance = {
  terminal: Terminal;
  fitAddon: FitAddon;
  id: string;
};

const App = () => {
  const [instances, setInstances] = useState<TerminalInstance[]>([]);
  const findTerminalById = useCallback(
    (terminalId: string) => {
      return instances.find(({ id }) => id === terminalId);
    },
    [instances],
  );
  const createTerminalIfNotExists = useCallback(
    (id: string): TerminalInstance => {
      const found = findTerminalById(id);
      if (found) {
        return found;
      }
      const terminal = new Terminal({
        /**
         * VSCode doesn't expose the raw string for specific theme color.
         * this is awkward. have to hard-code.
         */
        theme: { background: '#282c34' },
        fontSize: 12,
        fontFamily: '"Fira Code", "Source Code Pro", courier-new, courier, monospace',
      });
      const fitAddon = new FitAddon();

      terminal.onData((data) => {
        const action: WebviewAction = {
          action: WebviewActionEnum.TerminalCmd,
          payload: { terminalId: id, data },
        };
        vscodeApi.postMessage(action);
      });
      return { id, terminal, fitAddon };
    },
    [findTerminalById],
  );

  useEffect(() => {
    vscodeApi.postMessage({ action: WebviewActionEnum.RequestData });
  }, []);

  useListenMessage(({ action, payload }: WebviewAction) => {
    if (action === WebviewActionEnum.SetTerminals) {
      const ids = payload as string[];
      setInstances(ids.map((id) => createTerminalIfNotExists(id)));
    }

    if (action === WebviewActionEnum.TerminalStdout) {
      const { terminalId, data } = payload as TerminalData;
      findTerminalById(terminalId)?.terminal.write(data);
    }
  });

  return (
    <div className={styles.app}>
      {instances.map(({ id, terminal, fitAddon }) => (
        <TerminalView key={id} terminal={terminal} fitAddon={fitAddon} />
      ))}
      <div className={styles.newTerminal} title="New Terminal">
        <TerminalIcon />
      </div>
    </div>
  );
};

export default App;
