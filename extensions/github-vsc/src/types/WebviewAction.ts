export enum WebviewActionEnum {
  RequestData = 'RequestData',
  UpdateData = 'UpdateData',
  ValidatePAT = 'ValidatePAT',
  ValidatePATResult = 'ValidatePATResult',
  ProposeChanges = 'ProposeChanges',
  ProposeChangesResult = 'ProposeChangesResult',
}

export type ProposeChangesPayload = {
  commitMessage: string;
  branchName: string;
};

export default interface WebviewAction {
  action: WebviewActionEnum;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any;
}
