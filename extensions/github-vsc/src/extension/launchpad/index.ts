import { RepoData } from '@src/core/types/foundation';
import WebviewAction, { WebviewActionEnum } from '@src/core/types/webview-action';
import { Disposable, ExtensionContext, window as vsCodeWindow } from 'vscode';
import { ControlPanelView } from '../control-panel-view';
import { GitHubFS } from '../github-fs';
import {
  commitChanges,
  postUpdateData,
  updateRepoData,
  validatePAT,
} from '../utils/action-handler';
import { getVSCodeData } from '../utils/global-state';

export class LaunchPad implements Disposable {
  private readonly extensionContext: ExtensionContext;
  private readonly controlPanelView: ControlPanelView;
  private readonly gitHubFS: GitHubFS;
  private readonly disposable: Disposable;

  constructor(extensionContext: ExtensionContext) {
    this.extensionContext = extensionContext;

    // init props
    this.gitHubFS = new GitHubFS(extensionContext, this.updateRepoData);
    this.controlPanelView = new ControlPanelView(extensionContext, this.actionHandler);

    // disposable
    this.disposable = Disposable.from(
      this.gitHubFS,
      vsCodeWindow.registerWebviewViewProvider('github-vsc-control-panel', this.controlPanelView),
    );
  }

  dispose(): void {
    this.disposable.dispose();
  }

  // MARK: webview action handler
  private actionHandler = async ({ action, payload }: WebviewAction) => {
    const webview = this.controlPanelView.getWebview();
    const context = this.extensionContext;

    if (action === WebviewActionEnum.ValidatePAT) {
      validatePAT(webview, context, payload, () => this.gitHubFS.onDataUpdated());
    }

    if (action === WebviewActionEnum.CommitChanges) {
      const { githubRef, ghfsSCM, root } = this.gitHubFS;
      commitChanges(webview, githubRef, payload, ghfsSCM.getChangedFiles(), root);
    }

    if (action === WebviewActionEnum.RequestData) {
      postUpdateData(webview, getVSCodeData(context));
    }
  };

  // MARK: data update handler
  private updateRepoData = (repoData?: RepoData) =>
    updateRepoData(this.extensionContext, this.controlPanelView.getWebview(), repoData);
}
