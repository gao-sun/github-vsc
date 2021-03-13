import {
  FSDeleteFilePayload,
  FSEventType,
  FSFileSearchPayload,
  FSRenameOrCopyPayload,
  FSTextSearchMatch,
  FSTextSearchPayload,
  FSWriteFilePayload,
  RunnerClientEvent,
  VscClientEvent,
} from '@github-vsc-runner/core';
import logger from '@src/core/utils/logger';
import { Buffer } from 'buffer/';
import { nanoid } from 'nanoid';
import { Socket } from 'socket.io-client';
import {
  CancellationToken,
  Disposable,
  EventEmitter,
  FileChangeEvent,
  FileChangeType,
  FileSearchOptions,
  FileSearchProvider,
  FileSearchQuery,
  FileStat,
  FileSystemError,
  FileSystemProvider,
  FileType,
  Progress,
  Range,
  TextSearchComplete,
  TextSearchOptions,
  TextSearchProvider,
  TextSearchQuery,
  TextSearchResult,
  Uri,
  workspace,
} from 'vscode';

type ResolveFn = (value: any) => void;
type RejectFn = (reason: any) => void;
type FSEventObject = {
  resolve: ResolveFn;
  afterResolve?: ResolveFn;
  reject: RejectFn;
  uri: Uri;
  timeoutHandle: ReturnType<typeof setTimeout>;
  progress?: Progress<TextSearchResult>;
};

export class RemoteSessionFS
  implements Disposable, FileSystemProvider, FileSearchProvider, TextSearchProvider {
  static scheme = 'rs-fs';
  static rootUri = Uri.parse(`${RemoteSessionFS.scheme}:/`);

  private _socket?: Socket;
  private _eventDict: Dictionary<string, FSEventObject> = {};

  get hasSocket(): boolean {
    return !!this._socket;
  }

  // MARK: disposable
  private readonly disposable: Disposable;

  constructor() {
    // TO-DO: remove registration when deinit
    this.disposable = Disposable.from(
      workspace.registerFileSystemProvider(RemoteSessionFS.scheme, this, {
        isCaseSensitive: true,
        isReadonly: false,
      }),
      workspace.registerFileSearchProvider(RemoteSessionFS.scheme, this),
      workspace.registerTextSearchProvider(RemoteSessionFS.scheme, this),
    );
  }

  dispose(): void {
    this.disposable.dispose();
  }

  // MARK: FileSearchProvider implmentation
  async provideFileSearchResults(
    { pattern }: FileSearchQuery,
    options: FileSearchOptions,
    // TO-DO: cancel request if needed
    token: CancellationToken,
  ): Promise<Uri[]> {
    logger.debug('file search', pattern, options);
    const payload: FSFileSearchPayload = {
      pattern,
      options: { ...options, folder: options.folder.path },
    };
    const paths = await this.makePromise<string[]>(
      FSEventType.FileSearch,
      RemoteSessionFS.rootUri,
      payload,
    );
    return paths.map((path) => Uri.joinPath(RemoteSessionFS.rootUri, path));
  }

  // MARK: TextSearchProvider implmentation
  async provideTextSearchResults(
    query: TextSearchQuery,
    options: TextSearchOptions,
    progress: Progress<TextSearchResult>,
    // TO-DO: cancel if needed
    token: CancellationToken,
  ): Promise<TextSearchComplete> {
    logger.debug('text search', query, options);
    const payload: FSTextSearchPayload = {
      query,
      options: { ...options, folder: options.folder.toString() },
    };
    return this.makePromise(
      FSEventType.TextSearch,
      options.folder,
      payload,
      60,
      undefined,
      progress,
    );
  }

  // MARK: FileSystemProvider implmentations
  watch(): Disposable {
    // ignore, fires for all changes...
    return new Disposable(() => {});
  }

  stat(uri: Uri): Promise<FileStat> {
    logger.debug('stat', uri.toString());
    return this.makePromise(FSEventType.Stat, uri, uri.toString());
  }

  readDirectory(uri: Uri): Promise<[string, FileType][]> {
    logger.debug('readDirectory', uri.toString());
    return this.makePromise(FSEventType.ReadDirectory, uri, uri.toString());
  }

  createDirectory(uri: Uri): Promise<void> {
    logger.debug('createDirectory', uri.toString());
    return this.makePromise(FSEventType.CreateDirectory, uri, uri.toString());
  }

  async readFile(uri: Uri): Promise<Uint8Array> {
    logger.debug('readFile', uri.toString());

    try {
      const content = await this.makePromise(FSEventType.ReadFile, uri, uri.toString(), 10);
      return Buffer.from(content as string, 'utf-8');
    } catch (error) {
      logger.warn('read file caught error', error);
      throw error;
    }
  }

  writeFile(
    uri: Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean },
  ): Promise<void> {
    logger.debug('writeFile', uri.toString());
    const payload: FSWriteFilePayload = {
      uri: uri.toString(),
      base64Content: Buffer.from(content).toString('base64'),
      options,
    };
    return this.makePromise(FSEventType.WriteFile, uri, payload, 10, () =>
      this._fireSoon({ type: FileChangeType.Changed, uri }),
    );
  }

  delete(uri: Uri, options: { recursive: boolean }): Promise<void> {
    logger.debug('delete', uri.toString());
    const payload: FSDeleteFilePayload = {
      uri: uri.toString(),
      options,
    };
    return this.makePromise(FSEventType.Delete, uri, payload);
  }

  rename(oldUri: Uri, newUri: Uri, options: { overwrite: boolean }): Promise<void> {
    logger.debug('reanme', oldUri.toString(), newUri.toString());
    const payload: FSRenameOrCopyPayload = {
      oldUri: oldUri.toString(),
      newUri: newUri.toString(),
      options,
    };
    return this.makePromise(FSEventType.Rename, oldUri, payload);
  }

  copy?(source: Uri, destination: Uri, options: { overwrite: boolean }): Promise<void> {
    logger.debug('copy', source.toString(), destination.toString());
    const payload: FSRenameOrCopyPayload = {
      oldUri: source.toString(),
      newUri: destination.toString(),
      options,
    };
    return this.makePromise(FSEventType.Copy, source, payload);
  }

  // MARK: FS events handling
  private makePromise<Response>(
    type: FSEventType,
    uri: Uri,
    payload: unknown,
    timeout = 5,
    afterResolve?: (value: Response) => void,
    progress?: Progress<TextSearchResult>,
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      const uuid = nanoid();
      const timeoutHandle = setTimeout(
        () =>
          reject(
            FileSystemError.Unavailable(`The ${type} operation took too long for uri: ${uri}`),
          ),
        timeout * 1000,
      );
      this._eventDict[uuid] = {
        resolve,
        afterResolve,
        reject,
        uri,
        timeoutHandle,
        progress,
      };
      this._socket?.emit(VscClientEvent.FSEvent, uuid, type, payload);
    });
  }

  registerFSEventHandlers(forSocket: Socket): void {
    const getFSError = (errorUri: Uri, error: NodeJS.ErrnoException): FileSystemError => {
      logger.debug('returned error', error);
      if (error.code === 'ENOENT') {
        return FileSystemError.FileNotFound(errorUri);
      }
      if (error.code === 'EISDIR') {
        return FileSystemError.FileIsADirectory(errorUri);
      }
      if (error.code === 'ENOTDIR') {
        return FileSystemError.FileNotADirectory(errorUri);
      }
      if (error.code === 'EEXIST') {
        return FileSystemError.FileExists(errorUri);
      }
      if (error.code === 'EACCES') {
        return FileSystemError.NoPermissions(errorUri);
      }
      return FileSystemError.Unavailable(errorUri);
    };

    this._socket = forSocket;
    // TO-DO: remove on dispose
    forSocket.on(RunnerClientEvent.FSEvent, (uuid: string, data: unknown) => {
      const event = this._eventDict[uuid];
      if (!event) {
        return;
      }

      logger.debug('received fs event for', uuid);
      clearTimeout(event.timeoutHandle);
      delete this._eventDict[uuid];
      event.resolve(data);
      event.afterResolve?.(data);
    });
    forSocket.on(
      RunnerClientEvent.FSTextSearchMatch,
      (uuid: string, { ranges, path, preview }: FSTextSearchMatch) => {
        logger.debug('recevied text match', uuid, path);
        this._eventDict[uuid]?.progress?.report({
          uri: Uri.parse(path),
          ranges: ranges.map(
            ({ startLine, startPosition, endLine, endPosition }) =>
              new Range(startLine, startPosition, endLine, endPosition),
          ),
          preview: {
            text: preview.text,
            matches: preview.matches.map(
              ({ startLine, startPosition, endLine, endPosition }) =>
                new Range(startLine, startPosition, endLine, endPosition),
            ),
          },
        });
      },
    );
    forSocket.on(RunnerClientEvent.FSEventError, (uuid: string, error: NodeJS.ErrnoException) => {
      const event = this._eventDict[uuid];
      if (!event) {
        return;
      }

      clearTimeout(event.timeoutHandle);
      delete this._eventDict[uuid];
      event.reject(getFSError(event.uri, error));
    });
  }

  // MARK: file events
  private _fileChangeEmitter = new EventEmitter<FileChangeEvent[]>();
  private _bufferedFileEvents: FileChangeEvent[] = [];
  private _fireSoonHandle: null | ReturnType<typeof setTimeout> = null;
  readonly onDidChangeFile = this._fileChangeEmitter.event;
  private _fireSoon(...events: FileChangeEvent[]): void {
    this._bufferedFileEvents.push(...events);

    if (this._fireSoonHandle) {
      clearTimeout(this._fireSoonHandle);
    }

    this._fireSoonHandle = setTimeout(() => {
      this._fileChangeEmitter.fire(this._bufferedFileEvents);
      this._bufferedFileEvents = [];
    }, 5);
  }
}
