import { workspace, window as vsCodeWindow } from 'vscode';
import { lookup } from './lookup';
import { Directory, File, GitHubLocation } from './types';

export const showDocumentIfNeeded = async (
  root: Directory,
  location: GitHubLocation,
): Promise<void> => {
  try {
    const [entry] = await lookup(root, location);
    if (entry instanceof File) {
      const document = await workspace.openTextDocument(location.uri);
      await vsCodeWindow.showTextDocument(document);
    }
  } catch {
    // do nothing
  }
};
