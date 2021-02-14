import * as vscode from 'vscode';
import { GitHubFS } from './github-fs';
import init from './init';

init();

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  context.subscriptions.push(new GitHubFS('octokit', 'core.js'));
  vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length, {
    uri: vscode.Uri.parse('github-fs:/'),
    name: 'GitHubFS Sample',
  });
  console.log('GitHub VSC activated');
}

export function deactivate(): void {}
