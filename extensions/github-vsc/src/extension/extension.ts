import * as vscode from 'vscode';
import { GitHubFS } from './github-fs';
import { updateAPIAuth } from './github-fs/apis';
import init from './init';
import { getVSCodeData } from './utils/global-state';
import { decodePathAsGitHubLocation } from './utils/uri-decode';

init();

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const vsCodeData = getVSCodeData(context);
  console.log('GitHub VSC activate with data', vsCodeData);

  updateAPIAuth(vsCodeData?.pat);

  const location = await decodePathAsGitHubLocation();
  const name = (location && `${location.owner}/${location.repo}:${location.ref}`) ?? 'GitHub VSC';
  console.log('decoded location', location);

  vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length, {
    uri: GitHubFS.rootUri,
    name,
  });

  context.subscriptions.push(new GitHubFS(context, location));

  console.log('GitHub VSC activated');
}

export function deactivate(): void {}
