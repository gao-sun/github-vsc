import { env, Uri, ExtensionContext, window as vsCodeWindow } from 'vscode';
import { getVSCodeData } from '../utils/global-state';
import { conditionalString, conditional } from '../utils/object';

let hasGlobalSearchLimitationInfoShown = false;

export const showGlobalSearchLimitationInfo = async (
  defaultBranch: Optional<string>,
  onSwitchBranch: () => void,
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
    'Learn More',
  );

  if (choose === 'Learn More') {
    env.openExternal(Uri.parse('https://docs.github.com/en/rest/reference/search#rate-limit'));
  }
};
