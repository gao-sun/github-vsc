declare const acquireVsCodeApi: <T = unknown>() => {
  getState: () => T;
  setState: (data: T) => void;
  postMessage: (msg: unknown) => void;
};

declare type VSCodeData = {
  pat?: string;
};

declare let vsCodeData: VSCodeData;
