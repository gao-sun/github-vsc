import React, { useCallback, useEffect } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { useResizeDetector } from 'react-resize-detector';

export type Props = {
  terminal: Terminal;
  fitAddon: FitAddon;
};

const TerminalView = ({ terminal, fitAddon }: Props) => {
  const onResize = useCallback(() => {
    fitAddon.fit();
    // TO-DO: send to remote
  }, [fitAddon]);
  const { ref } = useResizeDetector<HTMLDivElement>({ onResize });

  useEffect(() => {
    if (ref.current && !terminal.element) {
      terminal.loadAddon(fitAddon);
      terminal.open(ref.current);
    }
  }, [fitAddon, ref, terminal]);

  return <div ref={ref}></div>;
};

export default TerminalView;
