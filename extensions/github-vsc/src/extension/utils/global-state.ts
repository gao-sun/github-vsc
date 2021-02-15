import { ExtensionContext } from 'vscode';

export const getState = (context: ExtensionContext): ExtensionContext['globalState'] =>
  context.globalState;

const vsCodeDataKey = 'VS_CODE_DATA';

export const getVSCodeData = (context: ExtensionContext): Optional<VSCodeData> =>
  getState(context).get(vsCodeDataKey);

export const setPartialVSCodeData = async (
  context: ExtensionContext,
  partial: Partial<VSCodeData>,
): Promise<VSCodeData> => {
  const data = { ...getVSCodeData(context), ...partial };
  await getState(context).update(vsCodeDataKey, data);
  return data;
};
