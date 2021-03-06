import useListenMessage from '@src/core/hooks/useListenMessage';
import { TerminalData } from '@src/core/types/foundation';
import WebviewAction, { WebviewActionEnum } from '@src/core/types/webview-action';
import { vscodeApi } from '@src/core/utils/vscode';
import React, { useCallback, useEffect, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

import 'xterm/css/xterm.css';
import TerminalIcon from '../icons/Terminal';
import styles from './index.module.scss';
import TerminalView from './TerminalView';
import theme from './theme';

type TerminalInstance = {
  terminal: Terminal;
  fitAddon: FitAddon;
  id: string;
};

type TerminalDataPayload = {
  id: string;
  restoredFromRemote: boolean;
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
    ({ id, restoredFromRemote }: TerminalDataPayload): TerminalInstance => {
      const found = findTerminalById(id);
      if (found) {
        return found;
      }
      const terminal = new Terminal({
        theme,
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

      if (restoredFromRemote) {
        terminal.write('Session restored.\x85');
      }

      return { id, terminal, fitAddon };
    },
    [findTerminalById],
  );
  const createNewTerminal = useCallback(
    () => vscodeApi.postMessage({ action: WebviewActionEnum.ActivateTerminal }),
    [],
  );

  useEffect(() => {
    vscodeApi.postMessage({ action: WebviewActionEnum.RequestData });
  }, []);

  useEffect(() => {
    if (instances.length) {
      instances[instances.length - 1].terminal.focus();
    }
  }, [instances]);

  useListenMessage(({ action, payload }: WebviewAction) => {
    if (action === WebviewActionEnum.SetTerminals) {
      const ids = payload as TerminalDataPayload[];
      setInstances(ids.map((terminal) => createTerminalIfNotExists(terminal)));
    }

    if (action === WebviewActionEnum.TerminalStdout) {
      const { terminalId, data } = payload as TerminalData;
      findTerminalById(terminalId)?.terminal.write(data);
    }
  });

  return (
    <div className={styles.app}>
      {instances.map(({ id, terminal, fitAddon }) => (
        <TerminalView
          className={styles.terminal}
          id={id}
          key={id}
          terminal={terminal}
          fitAddon={fitAddon}
        />
      ))}
      <div onClick={createNewTerminal} className={styles.newTerminal} title="New Terminal">
        <TerminalIcon />
      </div>
    </div>
  );
};

export default App;
