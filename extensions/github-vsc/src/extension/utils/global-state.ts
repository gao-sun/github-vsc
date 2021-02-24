import { VSCodeData } from '@core/types/foundation';
import { ExtensionContext } from 'vscode';

export const getState = (context: ExtensionContext): ExtensionContext['globalState'] =>
  context.globalState;

const vsCodeDataKey = 'VS_CODE_DATA';
const messagePromptKey = 'MESSAGE_PROMPT';

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

const getMessagePrompt = (context: ExtensionContext) =>
  getState(context).get<Dictionary<string, boolean>>(messagePromptKey);

export const getMessagePromptDisabled = (context: ExtensionContext, forKey: string): boolean =>
  getMessagePrompt(context)?.[forKey] ?? false;

export const setMessagePromptDisabled = async (
  context: ExtensionContext,
  forKey: string,
  value: boolean,
): Promise<Dictionary<string, boolean>> => {
  const data = { ...getMessagePrompt(context), [forKey]: value };
  await getState(context).update(messagePromptKey, data);
  return data;
};
