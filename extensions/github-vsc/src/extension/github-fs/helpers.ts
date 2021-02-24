import { GitHubRef } from '@core/types/foundation';
import { window as vsCodeWindow, commands, Uri, Range, TextSearchMatch } from 'vscode';
import { GitHubFS } from '.';
import { SearchResponse } from '../apis';
import { getData } from './getter';
import { lookup } from './lookup';
import { Directory, File, GitHubLocation } from './types';

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
  owner: string,
  repo: string,
  data: SearchResponse,
): Promise<TextSearchMatch[]> =>
  Promise.all(
    data.items.map(async ({ text_matches, path, sha }) => {
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
          const { text: matchedText } = matches[0];
          const [matchStart, matchEnd] = getRange(parsedFragment, matchedText);

          return {
            fragment: parsedFragment,
            match: new Range(index, matchStart, index, matchEnd),
            matchedText,
          };
        });

      // kind of tricky here since GitHub doesn't return detailed match location
      // maybe provide an option to switch precise jumping?

      const content = (await getData(owner, repo, sha, true)).toString().split(/[\r\n]+/);

      return {
        uri: Uri.joinPath(GitHubFS.rootUri, path),
        ranges: organizedMatches.map(({ matchedText }) => {
          const foundIndex = content.findIndex((line) => line.includes(matchedText));
          if (foundIndex > -1) {
            const index = content[foundIndex].indexOf(matchedText);
            return new Range(foundIndex, index, foundIndex, index + matchedText.length);
          }
          return new Range(0, 0, 0, 0);
        }),
        preview: {
          text: organizedMatches.map(({ fragment }) => fragment).join('\n'),
          matches: organizedMatches.map(({ match }) => match),
        },
      };
    }),
  );
