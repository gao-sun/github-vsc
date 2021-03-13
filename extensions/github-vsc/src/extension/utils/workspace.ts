import { commands, Uri, workspace } from 'vscode';

export const reopenFolder = async (name: string, uri: Uri): Promise<void> => {
  await commands.executeCommand('workbench.action.closeAllEditors');
  workspace.updateWorkspaceFolders(0, workspace.workspaceFolders?.length, {
    uri,
    name,
  });
};
