import * as vscode from 'vscode';
import { ControlPanelView } from './control-panel-view';
import { GitHubFS } from './github-fs';
import init from './init';

declare const navigator: unknown;

init();

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  context.subscriptions.push(new GitHubFS('octokit', 'core.js'));
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('github-vsc-control-panel', new ControlPanelView()),
  );

  // local debug
  if (typeof navigator !== 'object') {
    vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length, {
      uri: vscode.Uri.parse(`${GitHubFS.scheme}:/`),
      name: 'GitHubFS Sample',
    });
  }

  console.log('GitHub VSC activated');
}

export function deactivate(): void {}
