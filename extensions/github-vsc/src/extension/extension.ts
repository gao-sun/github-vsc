import * as vscode from 'vscode';
import { GitHubFS } from './github-fs';
import { updateAPIAuth } from './github-fs/apis';
import init from './init';
import { getVSCodeData } from './utils/global-state';
import { decodePathAsGitHubRef } from './utils/uri-decode';

init();

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const vsCodeData = getVSCodeData(context);
  console.log('GitHub VSC activate with data', vsCodeData);

  updateAPIAuth(vsCodeData?.pat);

  const ref = await decodePathAsGitHubRef();
  const name = (ref && `${ref.owner}/${ref.repo}:${ref.ref}`) ?? 'GitHub VSC';
  console.log('decoded ref', ref);

  vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length, {
    uri: GitHubFS.rootUri,
    name,
  });

  context.subscriptions.push(new GitHubFS(context, ref));

  console.log('GitHub VSC activated');
}

export function deactivate(): void {}
