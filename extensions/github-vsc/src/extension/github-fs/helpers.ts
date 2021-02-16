import { window as vsCodeWindow, commands } from 'vscode';
import { lookup } from './lookup';
import { Directory, File, GitHubLocation } from './types';

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
