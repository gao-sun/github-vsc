import { window as vsCodeWindow, commands, Uri, Range, TextSearchMatch, env } from 'vscode';
import { GitHubFS } from '.';
import { conditional, conditionalString } from '../utils/object';
import { SearchResponse } from './apis';
import { lookup } from './lookup';
import { Directory, File, GitHubLocation, GitHubRef } from './types';

export const getGitHubRefDescription = (ref?: GitHubRef): string =>
  (ref && `${ref.owner}/${ref.repo}:${ref.ref}`) ?? 'GitHub VSC';

export const showDocumentOrRevealFolderIfNeeded = async (
  root: Directory,
  location: GitHubLocation,
): Promise<void> => {
  try {
    const [entry] = await lookup(root, location);
    if (entry instanceof File) {
      await vsCodeWindow.showTextDocument(location.uri);
    }
    if (entry instanceof Directory) {
      // https://github.com/microsoft/vscode/issues/94720
      await commands.executeCommand('revealInExplorer', location.uri);
    }
  } catch {
    // do nothing
  }
};

const firstNewLineBeforeIndex = (str: string, index: number) => {
  for (let i = index - 1; i >= 0; --i) {
    if (str[i] === '\n' || str[i] === '\r') {
      return i;
    }
  }
  return -1;
};

const firstNewLineAfterIndex = (str: string, index: number) => {
  for (let i = index + 1; i < str.length; ++i) {
    if (str[i] === '\n' || str[i] === '\r') {
      return i;
    }
  }
  return str.length;
};

const getRange = (str: string, match: string): [number, number] => {
  const index = str.indexOf(match);

  if (index < 0) {
    return [0, 0];
  }
  return [index, index + match.length];
};

export const convertGitHubSearchResponseToSearchResult = (
  data: SearchResponse,
): TextSearchMatch[] =>
  data.items.map(({ text_matches, path }) => {
    const organizedMatches = text_matches
      .filter(({ matches }) => !!matches[0])
      .map(({ fragment, matches }, index) => {
        const [start, end] = matches[0].indices;
        const parsedFragment = fragment
          .slice(
            firstNewLineBeforeIndex(fragment, start) + 1,
            firstNewLineAfterIndex(fragment, end),
          )
          .replace(/(\r\n|\r|\n)/g, ' ');
        const parsedMatchText = matches[0].text.replace(/(\r\n|\r|\n)/g, ' ');
        const [matchStart, matchEnd] = getRange(parsedFragment, parsedMatchText);

        return {
          fragment: parsedFragment,
          match: new Range(index, matchStart, index, matchEnd),
        };
      });

    return {
      uri: Uri.joinPath(GitHubFS.rootUri, path),
      // kind of tricky here since GitHub doesn't return detailed match location
      // maybe provide an option to turn on precise jumping?
      ranges: organizedMatches.map((_, index) => new Range(index, 0, index, 0)),
      preview: {
        text: organizedMatches.map(({ fragment }) => fragment).join('\n'),
        matches: organizedMatches.map(({ match }) => match),
      },
    };
  });

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
