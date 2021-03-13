import { env, Uri, ExtensionContext, window as vsCodeWindow } from 'vscode';
import { openControlPanel } from '../utils/commands';
import { getMessagePromptDisabled, hasPAT, setMessagePromptDisabled } from '../utils/global-state';
import { conditionalString, conditional } from '../utils/object';

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
  const hasAuthToken = hasPAT(context);

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

let hasEditingNotValidWarningShown = false;

export const showEditingNotValidWarning = async (): Promise<void> => {
  if (hasEditingNotValidWarningShown) {
    return;
  }

  hasEditingNotValidWarningShown = true;
  const choose = await vsCodeWindow.showInformationMessage(
    'Setup PAT for committing changes to the branch or starting a pull request.',
    { modal: true },
    'Setup PAT',
  );
  if (choose === 'Setup PAT') {
    openControlPanel();
  }
};
