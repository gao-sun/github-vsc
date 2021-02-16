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
} from 'vscode';
import { Directory, Entry, GitHubLocation, GitHubRef } from './types';
import { lookup, lookupAsDirectory, lookupAsDirectorySilently, lookupAsFile } from './lookup';
import { ControlPanelView } from '../control-panel-view';
import { showDocumentOrRevealFolderIfNeeded } from './helpers';
import { getShortenRef, replaceLocation } from '../utils/uri-decode';

export class GitHubFS implements FileSystemProvider, FileSearchProvider, Disposable {
  static scheme = 'github-fs';
  static rootUri = Uri.parse(`${GitHubFS.scheme}:/`);

  // MARK: fs properties
  root = new Directory(GitHubFS.rootUri, '', '');
  githubRef?: GitHubRef;

  // MARK: fs helpers
  private getLocation(uri: Uri): Optional<GitHubLocation> {
    if (!this.githubRef) {
      return;
    }

    return { ...this.githubRef, uri };
  }

  // MARK: disposable
  private readonly disposable: Disposable;

  constructor(extensionContext: ExtensionContext, location?: GitHubLocation) {
    this.disposable = Disposable.from(
      workspace.registerFileSystemProvider(GitHubFS.scheme, this, {
        isCaseSensitive: true,
        isReadonly: true,
      }),
      workspace.registerFileSearchProvider(GitHubFS.scheme, this),
      vsCodeWindow.registerWebviewViewProvider(
        'github-vsc-control-panel',
        new ControlPanelView(extensionContext),
      ),
      // change uri when document opening/closing
      vsCodeWindow.onDidChangeActiveTextEditor((editor) => {
        if (this.githubRef) {
          const { owner, repo, ref } = this.githubRef;
          replaceLocation(
            `/${owner}/${repo}/tree/${getShortenRef(ref)}${editor?.document.uri.path ?? ''}`,
          );
        }
      }),
    );

    if (location) {
      const { uri: _, ...githubRef } = location;
      this.githubRef = githubRef;
      showDocumentOrRevealFolderIfNeeded(this.root, location);
    }
  }

  dispose(): void {
    this.disposable?.dispose();
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
      return new Directory(uri, '', '');
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

  // to implement
  createDirectory(): void {}
  writeFile(): void {}
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

  // MARK: file events
  private _emitter = new EventEmitter<FileChangeEvent[]>();
  readonly onDidChangeFile = this._emitter.event;
}
