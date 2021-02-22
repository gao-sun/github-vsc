import * as vscode from 'vscode';
import { GitHubFS } from './github-fs';
import { updateAPIAuth } from './apis';
import init from './init';
import { getVSCodeData } from './utils/global-state';
import { showWelcomeInfo } from './github-fs/message';
import { TerminalView } from './terminal-view';
import { RemoteSession } from './remote-session';

init();

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const vsCodeData = getVSCodeData(context);
  console.log('GitHub VSC activate with data', vsCodeData);

  updateAPIAuth(vsCodeData?.userContext?.pat);
  showWelcomeInfo(context);

  context.subscriptions.push(new GitHubFS(context), new RemoteSession());

  context.subscriptions.push(
    vscode.commands.registerCommand('gvscTerminal.create', () => new TerminalView(context)),
  );

  console.log('GitHub VSC activated');
}

export function deactivate(): void {}
