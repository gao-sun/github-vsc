import * as vscode from 'vscode';
import { updateAPIAuth } from './apis';
import init from './init';
import { getVSCodeData } from './utils/global-state';
import { showWelcomeInfo } from './github-fs/message';
import { Launchpad } from './launchpad';
import logger from '@src/core/utils/logger';

init();

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const vsCodeData = getVSCodeData(context);
  logger.debug('GitHub VSC activate with data', vsCodeData);

  updateAPIAuth(vsCodeData?.userContext?.pat);
  showWelcomeInfo(context);

  context.subscriptions.push(new Launchpad(context));

  logger.info('GitHub VSC activated');
}

export function deactivate(): void {}
