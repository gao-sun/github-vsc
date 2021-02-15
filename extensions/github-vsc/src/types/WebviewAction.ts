export enum WebviewActionEnum {
  UpdateData = 'UpdateData',
  ValidatePAT = 'ValidatePAT',
  ValidatePATResult = 'ValidatePATResult',
}

export default interface WebviewAction {
  action: WebviewActionEnum;
  payload?: any;
}
