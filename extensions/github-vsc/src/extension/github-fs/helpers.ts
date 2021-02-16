import { workspace, window as vsCodeWindow, commands } from 'vscode';
import { lookup } from './lookup';
import { Directory, File, GitHubLocation } from './types';

export const showDocumentOrRevealFolderIfNeeded = async (
  root: Directory,
  location: GitHubLocation,
): Promise<void> => {
  try {
    const [entry] = await lookup(root, location);
    if (entry instanceof File) {
      const document = await workspace.openTextDocument(location.uri);
      await vsCodeWindow.showTextDocument(document);
    }
    if (entry instanceof Directory) {
      // https://github.com/microsoft/vscode/issues/94720
      await commands.executeCommand('revealInExplorer', location.uri);
    }
  } catch {
    // do nothing
  }
};
