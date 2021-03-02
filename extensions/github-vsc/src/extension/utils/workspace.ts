import { commands, Uri, workspace } from 'vscode';

export const reopenFolder = (name: string, uri: Uri): void => {
  commands.executeCommand('workbench.action.closeAllEditors');
  workspace.updateWorkspaceFolders(0, workspace.workspaceFolders?.length, {
    uri,
    name,
  });
};
