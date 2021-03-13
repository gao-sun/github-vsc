import WebviewAction from '@src/core/types/webview-action';
import { useEffect } from 'react';

const useListenMessage = (handler: (action: WebviewAction) => void | Promise<void>): void => {
  useEffect(() => {
    const listener = ({ data }: MessageEvent<WebviewAction>) => handler(data);
    window.addEventListener('message', listener);

    return () => window.removeEventListener('message', listener);
  });
};

export default useListenMessage;
