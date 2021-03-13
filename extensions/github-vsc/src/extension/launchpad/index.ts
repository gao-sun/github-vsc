import { RepoData } from '@src/core/types/foundation';
import WebviewAction, {
  ActivateTerminalPayload,
  WebviewActionEnum,
} from '@src/core/types/webview-action';
import { Disposable, ExtensionContext, Uri, window as vsCodeWindow } from 'vscode';
import { ControlPanelView } from '../control-panel-view';
import { GitHubFS } from '../github-fs';
import { showNoDefaultBranchWarning, showNoLocationWarning } from '../github-fs/message';
import { RemoteSession } from '../remote-session';
import {
  commitChanges,
  deliverRemoteSessionData,
  postUpdateData,
  setPortForwarding,
  updateRepoData,
  validatePAT,
} from '../utils/action-handler';
import { openControlPanel } from '../utils/commands';
import { getSessionData, getVSCodeData } from '../utils/global-state';
import { decodePathAsGitHubLocation } from '../utils/uri-decode';
import { confirmDiscardEditorChanges, showSessionRestorePrompt } from './message';

export class Launchpad implements Disposable {
  private readonly remoteSession: RemoteSession;
  private readonly extensionContext: ExtensionContext;
  private readonly controlPanelView: ControlPanelView;
  private readonly gitHubFS: GitHubFS;
  private readonly disposable: Disposable;

  constructor(extensionContext: ExtensionContext) {
    this.extensionContext = extensionContext;

    // init props
    this.gitHubFS = new GitHubFS(extensionContext, this.updateRepoData);
    this.controlPanelView = new ControlPanelView(extensionContext, this.actionHandler);
    this.remoteSession = new RemoteSession(
      extensionContext,
      (payload) => deliverRemoteSessionData(this.controlPanelView.getWebview(), payload),
      (port) => setPortForwarding(this.controlPanelView.getWebview(), port),
      () => this.init(),
    );

    // disposable
    this.disposable = Disposable.from(
      this.gitHubFS,
      vsCodeWindow.registerWebviewViewProvider('github-vsc-control-panel', this.controlPanelView),
    );

    this.init();
  }

  dispose(): void {
    this.disposable.dispose();
  }

  // MARK: init
  private async init() {
    const [urlLocation, defaultBranch] = await decodePathAsGitHubLocation();
    const existingSession = getSessionData(this.extensionContext, urlLocation);

    if (!urlLocation) {
      return showNoLocationWarning(() =>
        this.gitHubFS.switchTo({
          owner: 'gao-sun',
          repo: 'github-vsc',
          ref: 'master',
          uri: Uri.joinPath(GitHubFS.rootUri, 'README.md'),
        }),
      );
    }

    if (
      existingSession &&
      (await showSessionRestorePrompt(urlLocation, existingSession, () => {
        openControlPanel();
        this.remoteSession.connectTo(existingSession);
      }))
    ) {
      return;
    }

    if (!defaultBranch) {
      return showNoDefaultBranchWarning(urlLocation);
    }

    this.gitHubFS.switchTo(urlLocation);
  }

  // MARK: webview action handler
  private actionHandler = async ({ action, payload }: WebviewAction) => {
    const webview = this.controlPanelView.getWebview();
    const context = this.extensionContext;

    if (action === WebviewActionEnum.ConnectToRemoteSession) {
      if (
        this.gitHubFS.ghfsSCM.getChangedFiles().length > 0 &&
        !(await confirmDiscardEditorChanges())
      ) {
        this.remoteSession.disconnectRunner();
        return;
      }

      if (await this.remoteSession.connectTo(payload)) {
        postUpdateData(webview, getVSCodeData(context));
      }
    }

    if (action === WebviewActionEnum.RequestRemoteSessionData) {
      this.remoteSession.deliverStatusData();
    }

    if (action === WebviewActionEnum.RequestPortForwardingData) {
      this.remoteSession.deliverPortForwardingData();
    }

    if (action === WebviewActionEnum.ActivateTerminal) {
      const { shell } = payload as ActivateTerminalPayload;
      this.remoteSession.activateTerminal(shell);
    }

    if (action === WebviewActionEnum.SetPortForwarding) {
      this.remoteSession.setPortForwarding(payload);
    }

    if (action === WebviewActionEnum.DisconnectRemoteRession) {
      this.remoteSession.disconnectRunner();
    }

    if (action === WebviewActionEnum.TerminateRemoteRession) {
      if (await this.remoteSession.terminate()) {
        postUpdateData(webview, getVSCodeData(context));
      }
    }

    if (action === WebviewActionEnum.ValidatePAT) {
      validatePAT(webview, context, payload, () => this.init());
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
