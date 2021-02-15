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
} from 'vscode';
import { Directory, Entry, GitHubLocation } from './types';
import { lookup, lookupAsDirectory, lookupAsFile } from './lookup';
import { updateAPIAuth } from './apis';
import { getVSCodeData } from '../utils/global-state';

export class GitHubFS implements FileSystemProvider, FileSearchProvider, Disposable {
  static scheme = 'github-fs';

  // MARK: fs properties
  root = new Directory(Uri.parse(`${GitHubFS.scheme}:/`), '', '');
  owner: string;
  repo: string;

  // MARK: fs helpers
  private getLocation(uri: Uri): GitHubLocation {
    return { owner: this.owner, repo: this.repo, uri };
  }

  // MARK: disposable
  private readonly disposable: Disposable;

  constructor(extensionContext: ExtensionContext, owner: string, repo: string) {
    this.owner = owner;
    this.repo = repo;
    this.disposable = Disposable.from(
      workspace.registerFileSystemProvider(GitHubFS.scheme, this, {
        isCaseSensitive: true,
        isReadonly: true,
      }),
      workspace.registerFileSearchProvider(GitHubFS.scheme, this),
    );
    updateAPIAuth(getVSCodeData(extensionContext)?.pat);
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
    const [entry] = await lookup(this.root, this.getLocation(uri));
    return entry;
  }

  async readDirectory(uri: Uri): Promise<[string, FileType][]> {
    console.log('readDirectory', uri.path);
    const [, entries] = await lookupAsDirectory(this.root, this.getLocation(uri));
    return [...entries.entries()].map(([name, { type }]) => [name, type]);
  }

  async readFile(uri: Uri): Promise<Uint8Array> {
    console.log('readFile', uri.path);
    const [, data] = await lookupAsFile(this.root, this.getLocation(uri));
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
    token: CancellationToken,
  ): Promise<Uri[]> {
    return [];
    const [, entries] = await lookupAsDirectory(this.root, this.getLocation(this.root.uri));
    return [...entries.entries()].map(([, { uri }]) => uri);
  }

  // MARK: file events
  private _emitter = new EventEmitter<FileChangeEvent[]>();
  readonly onDidChangeFile = this._emitter.event;
}
