/**
 * Note: I do not prefer OOP in TS - especially without class extension.
 * Classes will be only used to make VSCode happy.
 */

import {
  CancellationToken,
  Disposable,
  EventEmitter,
  ExtensionContext,
  FileChangeEvent,
  FileSearchOptions,
  FileSearchProvider,
  FileSearchQuery,
  FileSystemProvider,
  FileType,
  Uri,
  workspace,
  window as vsCodeWindow,
  TextSearchProvider,
  Progress,
  TextSearchComplete,
  TextSearchOptions,
  TextSearchQuery,
  TextSearchResult,
  FileChangeType,
  FileDecorationProvider,
  FileDecoration,
  ThemeColor,
  commands,
} from 'vscode';
import { Directory, Entry, GitFileMode, GitHubLocation } from './types';
import {
  lookup,
  lookupAsDirectory,
  lookupAsDirectorySilently,
  lookupAsFile,
  lookupIfFileDirtyWithoutFetching,
} from './lookup';
import { ControlPanelView } from '../control-panel-view';
import {
  convertGitHubSearchResponseToSearchResult,
  getGitHubRefDescription,
  showDocumentOrRevealFolderIfNeeded,
} from './helpers';
import { decodePathAsGitHubLocation, replaceLocation } from '../utils/uri-decode';
import { getPermission, searchCode } from '../apis';
import { reopenFolder } from '../utils/workspace';
import { writeFile } from './write-file';
import { GHFSSourceControl } from './source-control';
import { isDataDirtyWithoutFetching } from './getter';
import { GitHubRef } from '@core/types/foundation';
import {
  postUpdateData,
  commitChanges,
  updateRepoData,
  validatePAT,
} from '../utils/action-handler';
import { getVSCodeData } from '../utils/global-state';
import {
  showGlobalSearchLimitationInfo,
  showGlobalSearchAPIInfo,
  showNoLocationWarning,
  showNoDefaultBranchWarning,
  openControlPanel,
} from './message';
import WebviewAction, { WebviewActionEnum } from '@src/core/types/webview-action';
import { getShortenRef } from '../../core/utils/git-ref';

export class GitHubFS
  implements
    FileSystemProvider,
    FileSearchProvider,
    TextSearchProvider,
    FileDecorationProvider,
    Disposable {
  static scheme = 'github-fs';
  static rootUri = Uri.parse(`${GitHubFS.scheme}:/`);

  // MARK: fs properties
  private ghfsSCM: GHFSSourceControl;
  private root = new Directory(GitHubFS.rootUri, '', '', GitFileMode.Tree);
  private githubRef?: GitHubRef;
  private controlPanelView: ControlPanelView;
  private defaultBranch?: string;
  readonly extensionContext: ExtensionContext;

  // MARK: fs helpers
  private getLocation(uri: Uri): Optional<GitHubLocation> {
    if (!this.githubRef) {
      return;
    }

    return { ...this.githubRef, uri };
  }

  private isOnDefaultBranch(): boolean {
    const ref = this.githubRef?.ref;
    const defaultBranch = this.defaultBranch;

    if (!ref || !defaultBranch) {
      return false;
    }

    return ref === defaultBranch || getShortenRef(ref) === defaultBranch;
  }

  private reopen(name: string, ref?: GitHubRef) {
    this.githubRef = ref;
    reopenFolder(name);
    // update decorations
    this.ghfsSCM
      .getChangedFiles()
      .forEach((uri) => this._fireSoon({ type: FileChangeType.Changed, uri }));
    this.ghfsSCM.removeAllChangedFiles();
    this.updateBroswerUrl();
    this.updateRepoData();
  }

  private async updateRepoData(fetchPermission = true) {
    const vsCodeData = await getVSCodeData(this.extensionContext);

    if (!this.githubRef) {
      updateRepoData(this.extensionContext, this.controlPanelView.getWebview(), undefined);
      return;
    }

    const { owner, repo } = this.githubRef;

    try {
      const permission = fetchPermission
        ? (await getPermission(owner, repo, vsCodeData?.userContext)).data.permission
        : vsCodeData?.repoData?.permission;

      updateRepoData(this.extensionContext, this.controlPanelView.getWebview(), {
        ref: this.githubRef,
        permission,
        commitMessage: this.ghfsSCM.scm.inputBox.value,
        changedFiles: this.ghfsSCM.getChangedFiles(),
      });
    } catch {
      updateRepoData(this.extensionContext, this.controlPanelView.getWebview(), {
        ref: this.githubRef,
        commitMessage: this.ghfsSCM.scm.inputBox.value,
        changedFiles: this.ghfsSCM.getChangedFiles(),
      });
    }
  }

  private async switchTo(location?: GitHubLocation): Promise<void> {
    // get from browser URL
    if (!location) {
      const [urlLocation, defaultBranch] = await decodePathAsGitHubLocation();
      this.defaultBranch = defaultBranch;

      if (!urlLocation) {
        return showNoLocationWarning(() =>
          this.switchTo({
            owner: 'gao-sun',
            repo: 'github-vsc',
            ref: 'master',
            uri: Uri.joinPath(GitHubFS.rootUri, 'README.md'),
          }),
        );
      }

      if (!defaultBranch) {
        return showNoDefaultBranchWarning(urlLocation);
      }

      return this.switchTo(urlLocation);
    }

    const description = getGitHubRefDescription(location);
    this.root = new Directory(GitHubFS.rootUri, description, description, GitFileMode.Tree);

    if (!location) {
      this.reopen(description, undefined);
      return;
    }

    const { uri, ...githubRef } = location;

    if (uri.path === '/') {
      const [, entries] = await lookupAsDirectory(this.root, location);
      const readme = [...entries.keys()].find((name) => {
        const splitted = name.toLowerCase().split('.');
        return splitted.length === 2 && splitted[0] === 'readme';
      });
      if (readme) {
        this.switchTo({ ...githubRef, uri: Uri.joinPath(uri, readme) });
        return;
      }
    }

    this.reopen(description, githubRef);
    showDocumentOrRevealFolderIfNeeded(this.root, location);
  }

  private updateBroswerUrl() {
    if (this.githubRef) {
      const { owner, repo, ref } = this.githubRef;
      replaceLocation(
        `/${owner}/${repo}/tree/${getShortenRef(ref)}${
          vsCodeWindow.activeTextEditor?.document.uri.path ?? ''
        }`,
      );
    }
  }

  // MARK: webview action handler
  private onDataUpdated() {
    this.switchTo();
  }

  private async actionHandler({ action, payload }: WebviewAction) {
    const webview = this.controlPanelView.getWebview();
    const context = this.extensionContext;

    if (action === WebviewActionEnum.ValidatePAT) {
      validatePAT(webview, context, payload, () => this.onDataUpdated());
    }

    if (action === WebviewActionEnum.CommitChanges) {
      commitChanges(webview, this.githubRef, payload, this.ghfsSCM.getChangedFiles(), this.root);
    }

    if (action === WebviewActionEnum.RequestData) {
      postUpdateData(webview, getVSCodeData(context));
    }
  }

  // MARK: disposable
  private readonly disposable: Disposable;

  constructor(extensionContext: ExtensionContext) {
    this.extensionContext = extensionContext;
    this.ghfsSCM = new GHFSSourceControl(GitHubFS.rootUri);
    // TO-DO: de-couple this from FS
    this.controlPanelView = new ControlPanelView(extensionContext, (action) =>
      this.actionHandler(action),
    );
    this.disposable = Disposable.from(
      workspace.registerFileSystemProvider(GitHubFS.scheme, this, {
        isCaseSensitive: true,
      }),
      workspace.registerFileSearchProvider(GitHubFS.scheme, this),
      workspace.registerTextSearchProvider(GitHubFS.scheme, this),
      vsCodeWindow.registerWebviewViewProvider('github-vsc-control-panel', this.controlPanelView),
      // change uri when document opening/closing
      vsCodeWindow.onDidChangeActiveTextEditor(() => this.updateBroswerUrl()),
      vsCodeWindow.registerFileDecorationProvider(this),
      commands.registerCommand(GHFSSourceControl.commitChangesCommand, () => {
        this.updateRepoData(false);
        openControlPanel();
      }),
      this.ghfsSCM,
    );

    this.switchTo();
  }

  dispose(): void {
    this.disposable.dispose();
  }

  // MARK: FileDecorationProvider implementation
  async provideFileDecoration(
    uri: Uri,
    token: CancellationToken,
  ): Promise<Optional<FileDecoration>> {
    const location = this.getLocation(uri);

    if (!location) {
      return;
    }

    if (!(await lookupIfFileDirtyWithoutFetching(this.root, location))) {
      return;
    }

    return new FileDecoration('M', undefined, new ThemeColor('inputValidation.warningBorder'));
  }

  // MARK: FileSystemProvider implmentations
  watch(): Disposable {
    // ignore, fires for all changes...
    return new Disposable(() => {});
  }

  async stat(uri: Uri): Promise<Entry> {
    console.log('stat', uri.path);

    const location = this.getLocation(uri);
    if (!location) {
      return new Directory(uri, '', '', GitFileMode.Tree);
    }

    const [entry] = await lookup(this.root, location);
    return entry;
  }

  async readDirectory(uri: Uri): Promise<[string, FileType][]> {
    console.log('readDirectory', uri.path);

    const location = this.getLocation(uri);
    if (!location) {
      return [];
    }

    const [, entries] = await lookupAsDirectory(this.root, location);
    return [...entries.entries()].map(([name, { type }]) => [name, type]);
  }

  async readFile(uri: Uri): Promise<Uint8Array> {
    console.log('readFile', uri.path);

    const location = this.getLocation(uri);

    if (!location) {
      return Buffer.from('');
    }

    const [, data] = await lookupAsFile(this.root, location);
    return data;
  }

  async writeFile(uri: Uri, content: Uint8Array): Promise<void> {
    const location = this.getLocation(uri);

    if (!location) {
      return;
    }

    try {
      const { sha } = await writeFile(this.root, location, content);

      // use `.then()` for quicker returning
      isDataDirtyWithoutFetching(sha).then((isDirty) => {
        if (isDirty) {
          this.ghfsSCM.addChangedFile(uri);
        } else {
          this.ghfsSCM.removeChangedFile(uri);
        }
        this.updateRepoData(false);
      });
      this._fireSoon({ type: FileChangeType.Changed, uri });
    } catch {
      vsCodeWindow.showWarningMessage('Unsupported operation.');
    }
  }

  // to implement
  createDirectory(): void {}
  delete(): void {}
  rename(): void {}
  copy(): void {}

  // MARK: FileSearchProvider implmentation
  async provideFileSearchResults(
    query: FileSearchQuery,
    options: FileSearchOptions,
    // TO-DO: cancel request if needed
    token: CancellationToken,
  ): Promise<Uri[]> {
    const segments = query.pattern.split('/');
    const parentLocation = this.getLocation(
      Uri.joinPath(this.root.uri, ...segments.slice(0, segments.length - 1)),
    );
    const currentLocation = this.getLocation(Uri.joinPath(this.root.uri, ...segments));

    if (!parentLocation || !currentLocation) {
      return [];
    }

    // TO-DO: investigate how to implement case insensitive search
    const [[, parentEntries], [, currentEntries]] = await Promise.all([
      lookupAsDirectorySilently(this.root, parentLocation),
      lookupAsDirectorySilently(this.root, currentLocation),
    ]);

    return [...parentEntries.entries(), ...currentEntries.entries()].map(([, { uri }]) => uri);
  }

  // MARK: TextSearchProvider implmentation
  async provideTextSearchResults(
    query: TextSearchQuery,
    options: TextSearchOptions,
    progress: Progress<TextSearchResult>,
    // TO-DO: cancel if needed
    token: CancellationToken,
  ): Promise<TextSearchComplete> {
    // leave this false - ignore `options.maxResults` just show top 100 results
    // until someone complain
    const result: TextSearchComplete = { limitHit: false };
    const ref = this.githubRef;
    const defaultBranch = this.defaultBranch;

    if (!ref || !this.isOnDefaultBranch()) {
      showGlobalSearchLimitationInfo(this.extensionContext, defaultBranch, async () => {
        if (defaultBranch && this.githubRef) {
          if (this.ghfsSCM.getChangedFiles().length > 0) {
            const choose = await vsCodeWindow.showWarningMessage(
              'Switching branch will discard uncommitted changes.',
              { modal: true },
              'OK',
            );

            if (choose !== 'OK') {
              return;
            }
          }
          this.switchTo({ ...this.githubRef, ref: defaultBranch, uri: GitHubFS.rootUri });
        }
      });
      return result;
    }

    showGlobalSearchAPIInfo(this.extensionContext);

    try {
      const { data } = await searchCode(ref.owner, ref.repo, query.pattern);
      (
        await convertGitHubSearchResponseToSearchResult(ref.owner, ref.repo, data)
      ).forEach((match) => progress.report(match));
    } catch (error) {
      vsCodeWindow.showWarningMessage(error?.message ?? 'Endpoint responded with error.');
    }

    return result;
  }

  // MARK: file events
  private _fileChangeEmitter = new EventEmitter<FileChangeEvent[]>();
  private _fileDecorationChangeEmitter = new EventEmitter<Uri[]>();
  private _bufferedFileEvents: FileChangeEvent[] = [];
  private _bufferedFileDecorationEvents: Uri[] = [];
  readonly onDidChangeFile = this._fileChangeEmitter.event;
  readonly onDidChangeFileDecorations = this._fileDecorationChangeEmitter.event;
  private _fireSoonHandle: null | ReturnType<typeof setTimeout> = null;

  private _fireSoon(...events: FileChangeEvent[]): void {
    this._bufferedFileEvents.push(...events);
    this._bufferedFileDecorationEvents.push(...events.map(({ uri }) => uri));

    if (this._fireSoonHandle) {
      clearTimeout(this._fireSoonHandle);
    }

    this._fireSoonHandle = setTimeout(() => {
      this._fileChangeEmitter.fire(this._bufferedFileEvents);
      this._fileDecorationChangeEmitter.fire(this._bufferedFileDecorationEvents);
      this._bufferedFileEvents = [];
      this._bufferedFileDecorationEvents = [];
    }, 5);
  }
}
