import { commands } from 'vscode';

export const openControlPanel = (): Thenable<void> =>
  commands.executeCommand('workbench.action.setSideBarViewIndex', 5);
