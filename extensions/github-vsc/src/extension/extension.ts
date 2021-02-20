import * as vscode from 'vscode';
import { GitHubFS } from './github-fs';
import { updateAPIAuth } from './apis';
import init from './init';
import { getVSCodeData } from './utils/global-state';
import { showWelcomeInfo } from './github-fs/message';

init();

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const vsCodeData = getVSCodeData(context);
  console.log('GitHub VSC activate with data', vsCodeData);

  updateAPIAuth(vsCodeData?.userContext?.pat);
  showWelcomeInfo(context);

  context.subscriptions.push(new GitHubFS(context));

  console.log('GitHub VSC activated');
}

export function deactivate(): void {}
