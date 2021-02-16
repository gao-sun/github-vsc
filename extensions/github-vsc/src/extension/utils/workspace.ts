import { commands, workspace } from 'vscode';
import { GitHubFS } from '../github-fs';

export const reopenFolder = (name: string): void => {
  commands.executeCommand('workbench.action.closeAllEditors');
  workspace.updateWorkspaceFolders(0, workspace.workspaceFolders?.length, {
    uri: GitHubFS.rootUri,
    name,
  });
};
