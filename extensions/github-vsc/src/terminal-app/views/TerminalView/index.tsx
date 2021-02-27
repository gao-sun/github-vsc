import React, { useCallback, useEffect } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { useResizeDetector } from 'react-resize-detector';
import WebviewAction, { WebviewActionEnum } from '@src/core/types/webview-action';
import { vscodeApi } from '@src/core/utils/vscode';

export type Props = {
  id: string;
  className?: string;
  terminal: Terminal;
  fitAddon: FitAddon;
};

const TerminalView = ({ id, terminal, fitAddon, className }: Props) => {
  const onResize = useCallback(() => {
    fitAddon.fit();
    const { rows, cols } = fitAddon.proposeDimensions();
    console.log('proposed new dimensions', rows, cols);

    if (!rows || !cols) {
      return;
    }

    const action: WebviewAction = {
      action: WebviewActionEnum.TerminalSetDimensions,
      payload: {
        id,
        rows,
        cols,
      },
    };
    vscodeApi.postMessage(action);
  }, [fitAddon, id]);
  const { ref } = useResizeDetector<HTMLDivElement>({ onResize });

  useEffect(() => {
    if (ref.current && !terminal.element) {
      terminal.loadAddon(fitAddon);
      terminal.open(ref.current);
    }
  }, [fitAddon, ref, terminal]);

  return <div className={className} ref={ref}></div>;
};

export default TerminalView;
