import { env, Uri, ExtensionContext, window as vsCodeWindow } from 'vscode';
import { openControlPanel } from '../utils/commands';
import {
  getMessagePromptDisabled,
  getVSCodeData,
  setMessagePromptDisabled,
} from '../utils/global-state';
import { conditionalString, conditional } from '../utils/object';
import { GitHubLocation } from './types';

const globalSearchLimitationKey = 'GLOBAL_SEARCH_LIMITATION';
let hasGlobalSearchLimitationInfoShown = false;

export const showGlobalSearchLimitationInfo = async (
  context: ExtensionContext,
  defaultBranch: Optional<string>,
  onSwitchBranch: () => void | Promise<void>,
): Promise<void> => {
  if (
    getMessagePromptDisabled(context, globalSearchLimitationKey) ||
    hasGlobalSearchLimitationInfoShown
  ) {
    return;
  }
  hasGlobalSearchLimitationInfoShown = true;
  const choose = await vsCodeWindow.showInformationMessage(
    'Cannot procceed searching for un-opened files due to the limitation of GitHub API. ' +
      `Global search is only availble on the default branch ${conditionalString(
        defaultBranch && `\`${defaultBranch}\``,
      )}.`,
    ...[
      'Learn More',
      conditional(defaultBranch && `Switch to ${defaultBranch}`),
      "Don't Bug Me Again",
    ].compact(),
  );

  if (choose === 'Learn More') {
    env.openExternal(
      Uri.parse('https://docs.github.com/en/rest/reference/search#considerations-for-code-search'),
    );
  }

  if (choose?.startsWith('Switch to')) {
    onSwitchBranch();
  }

  if (choose?.startsWith("Don't")) {
    setMessagePromptDisabled(context, globalSearchLimitationKey, true);
  }
};

const globalSearchAPIInfoKey = 'GLOBAL_SEARCH_API_INFO';
let hasGlobalSearchAPIInfoShown = false;

export const showGlobalSearchAPIInfo = async (context: ExtensionContext): Promise<void> => {
  if (getMessagePromptDisabled(context, globalSearchAPIInfoKey) || hasGlobalSearchAPIInfoShown) {
    return;
  }

  hasGlobalSearchAPIInfoShown = true;
  const hasAuthToken = !!getVSCodeData(context)?.userContext?.pat;

  const choose = await vsCodeWindow.showInformationMessage(
    'The Search API has a custom rate limit. ' +
      (hasAuthToken
        ? 'For authenticated requests, the rate limit is 30 requests per minute.'
        : 'For unauthenticated requests, the rate limit is 10 requests per minute.'),
    ...['Learn More', conditional(!hasAuthToken && 'Setup PAT'), "Don't Bug Me Again"].compact(),
  );

  if (choose === 'Learn More') {
    env.openExternal(Uri.parse('https://docs.github.com/en/rest/reference/search#rate-limit'));
  }

  if (choose === 'Setup PAT') {
    openControlPanel();
  }

  if (choose?.startsWith("Don't")) {
    setMessagePromptDisabled(context, globalSearchAPIInfoKey, true);
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
