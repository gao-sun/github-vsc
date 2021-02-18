import { env, Uri, ExtensionContext, window as vsCodeWindow, commands } from 'vscode';
import { getVSCodeData } from '../utils/global-state';
import { conditionalString, conditional } from '../utils/object';
import { GitHubLocation } from './types';

const openControlPanel = () => commands.executeCommand('workbench.action.setSideBarViewIndex', 5);

let hasGlobalSearchLimitationInfoShown = false;

export const showGlobalSearchLimitationInfo = async (
  defaultBranch: Optional<string>,
  onSwitchBranch: () => void | Promise<void>,
): Promise<void> => {
  if (hasGlobalSearchLimitationInfoShown) {
    return;
  }
  hasGlobalSearchLimitationInfoShown = true;
  const choose = await vsCodeWindow.showInformationMessage(
    'Cannot procceed searching for un-opened files due to the limitation of GitHub API. ' +
      `Global search is only availble on the default branch ${conditionalString(
        defaultBranch && `\`${defaultBranch}\``,
      )}.`,
    ...[conditional(defaultBranch && `Switch to ${defaultBranch}`), 'Learn More'].compact(),
  );

  if (choose === 'Learn More') {
    env.openExternal(
      Uri.parse('https://docs.github.com/en/rest/reference/search#considerations-for-code-search'),
    );
  }

  if (choose?.startsWith('Switch to')) {
    onSwitchBranch();
  }
};

let hasGlobalSearchAPIInfoShown = false;

export const showGlobalSearchAPIInfo = async (context: ExtensionContext): Promise<void> => {
  if (hasGlobalSearchAPIInfoShown) {
    return;
  }

  hasGlobalSearchAPIInfoShown = true;
  const hasAuthToken = !!getVSCodeData(context)?.userContext?.pat;

  const choose = await vsCodeWindow.showInformationMessage(
    'The Search API has a custom rate limit. ' +
      (hasAuthToken
        ? 'For authenticated requests, the rate limit is 30 requests per minute.'
        : 'For unauthenticated requests, the rate limit is 10 requests per minute.'),
    ...['Learn More', conditional(!hasAuthToken && 'Setup PAT')].compact(),
  );

  if (choose === 'Learn More') {
    env.openExternal(Uri.parse('https://docs.github.com/en/rest/reference/search#rate-limit'));
  }

  if (choose === 'Setup PAT') {
    openControlPanel();
  }
};

export const showNoLocationWarning = async (): Promise<void> => {
  const choose = await vsCodeWindow.showInformationMessage(
    "It looks like there's no owner/repo info in the URL. Go to the Github VSC homepage for more information.",
    { modal: true },
    'Open Homepage',
  );

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
      ' Please check if you have entered the right URL and PAT is configured for private access, if applicable.',
    { modal: true },
    'Setup PAT',
  );
  if (choose === 'Setup PAT') {
    openControlPanel();
  }
};
