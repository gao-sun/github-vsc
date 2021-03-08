import { GitHubRef, SessionData } from '@src/core/types/foundation';
import { window as vsCodeWindow } from 'vscode';

export const showSessionRestorePrompt = async (
  { owner, repo, ref }: GitHubRef,
  { sessionId, serverAddress }: SessionData,
  onSessionResume: () => void,
): Promise<boolean> => {
  const choose = await vsCodeWindow.showInformationMessage(
    `You have a remote session of ${owner}/${repo}:${ref},\nServer=${serverAddress}\nID=${sessionId}\n\nWould you like to resume it now?`,
    { modal: true },
    'Resume Session',
  );

  if (choose === 'Resume Session') {
    onSessionResume();
    return true;
  }

  return false;
};

export const confirmDiscardEditorChanges = async (): Promise<boolean> => {
  const choose = await vsCodeWindow.showWarningMessage(
    'Start/resume a remote session will discard your current changes in online editor. Continue?',
    { modal: true },
    'OK',
  );

  return choose === 'OK';
};
