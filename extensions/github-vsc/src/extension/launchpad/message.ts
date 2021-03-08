import { GitHubRef, SessionData } from '@src/core/types/foundation';
import { window as vsCodeWindow } from 'vscode';

export const showSessionRestorePrompt = async (
  { owner, repo, ref }: GitHubRef,
  { sessionId, serverAddress }: SessionData,
  onSessionRestore: () => void,
): Promise<boolean> => {
  const choose = await vsCodeWindow.showInformationMessage(
    `You have a remote session of ${owner}/${repo}:${ref},\nServer=${serverAddress}\nID=${sessionId}\n\nWould you like to resume it now?`,
    { modal: true },
    'Resume Session',
  );

  if (choose === 'Resume Session') {
    onSessionRestore();
    return true;
  }

  return false;
};
