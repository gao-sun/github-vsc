import { GitHubRef, SessionData } from '@src/core/types/foundation';
import { env, ExtensionContext, Uri, window as vsCodeWindow } from 'vscode';
import { GitHubLocation } from '../github-fs/types';
import { openControlPanel } from '../utils/commands';
import { getMessagePromptDisabled, setMessagePromptDisabled } from '../utils/global-state';

const welcomeInfoKey = 'WELCOME_INFO';

export const showWelcomeInfo = async (context: ExtensionContext): Promise<void> => {
  if (getMessagePromptDisabled(context, welcomeInfoKey)) {
    return;
  }

  const choose = await vsCodeWindow.showInformationMessage(
    'GitHub VSC is an open-source project which is NOT created by GitHub nor Microsoft. Go to the homepage for more information.',
    'Open Homepage',
    "Don't Bug Me Again",
  );

  if (choose === 'Open Homepage') {
    env.openExternal(Uri.parse('https://github.com/gao-sun/github-vsc'));
  }

  if (choose?.startsWith("Don't")) {
    setMessagePromptDisabled(context, welcomeInfoKey, true);
  }
};

export const showNoLocationWarning = async (onDemo: () => void): Promise<void> => {
  const choose = await vsCodeWindow.showInformationMessage(
    "It looks like there's no owner/repo info in the URL. Go to the GitHub VSC homepage for more information.",
    { modal: true },
    'See Demo',
    'Open Homepage',
  );

  if (choose === 'See Demo') {
    onDemo();
  }

  if (choose === 'Open Homepage') {
    env.openExternal(Uri.parse('https://github.com/gao-sun/github-vsc'));
  }
};

export const showNoDefaultBranchWarning = async ({
  owner,
  repo,
}: GitHubLocation): Promise<void> => {
  const choose = await vsCodeWindow.showWarningMessage(
    `Unable to fetch the default branch of ${owner}/${repo}.` +
      ' Please check if you have entered the right URL and PAT is configured with repo scope for private access, if applicable.',
    { modal: true },
    'Setup PAT',
  );
  if (choose === 'Setup PAT') {
    openControlPanel();
  }
};

let hasSessionRestorePromptShown = false;

export const showSessionRestorePrompt = async (
  { owner, repo, ref }: GitHubRef,
  { sessionId, serverAddress }: SessionData,
  onSessionResume: () => void,
): Promise<boolean> => {
  if (hasSessionRestorePromptShown) {
    return false;
  }

  hasSessionRestorePromptShown = true;
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
