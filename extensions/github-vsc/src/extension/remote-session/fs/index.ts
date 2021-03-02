import { FSEventType, RunnerClientEvent, VscClientEvent } from '@github-vsc-runner/core';
import { Buffer } from 'buffer/';
import { nanoid } from 'nanoid';
import { Socket } from 'socket.io-client';
import {
  Disposable,
  EventEmitter,
  FileChangeEvent,
  FileStat,
  FileSystemError,
  FileSystemProvider,
  FileType,
  Uri,
  workspace,
} from 'vscode';

type ResolveFn = (value: any) => void;
type RejectFn = (reason: any) => void;
type FSEventObject = {
  resolve: ResolveFn;
  reject: RejectFn;
  uri: Uri;
  timeoutHandle: ReturnType<typeof setTimeout>;
};

export class RemoteSessionFS implements Disposable, FileSystemProvider {
  static scheme = 'rs-fs';
  static rootUri = Uri.parse(`${RemoteSessionFS.scheme}:/`);

  private _socket: Socket;
  private _eventDict: Dictionary<string, FSEventObject> = {};

  // MARK: disposable
  private readonly disposable: Disposable;

  constructor(socket: Socket) {
    this._socket = socket;
    this.registerFSEventHandlers();
    // TO-DO: remove registration when deinit
    this.disposable = Disposable.from(
      workspace.registerFileSystemProvider(RemoteSessionFS.scheme, this, {
        isCaseSensitive: true,
      }),
    );
  }

  dispose(): void {
    this.disposable.dispose();
  }

  // MARK: FileSystemProvider implmentations
  watch(): Disposable {
    // ignore, fires for all changes...
    return new Disposable(() => {});
  }

  stat(uri: Uri): Promise<FileStat> {
    console.log('stat', uri);
    return this.makePromise(FSEventType.Stat, uri, uri.toString());
  }

  readDirectory(uri: Uri): Promise<[string, FileType][]> {
    return this.makePromise(FSEventType.ReadDirectory, uri, uri.toString());
  }

  createDirectory(uri: Uri): void {}

  async readFile(uri: Uri): Promise<Uint8Array> {
    const content = await this.makePromise(FSEventType.ReadFile, uri, uri.toString());
    return Buffer.from(content as string, 'utf-8');
  }

  writeFile(
    uri: Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean },
  ): void {}

  delete(uri: Uri, options: { recursive: boolean }): void {}

  rename(oldUri: Uri, newUri: Uri, options: { overwrite: boolean }): void {}

  copy?(source: Uri, destination: Uri, options: { overwrite: boolean }): void {}

  // MARK: FS events handling
  private makePromise<Response>(
    type: FSEventType,
    uri: Uri,
    payload: unknown,
    timeout = 5,
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      const uuid = nanoid();
      const timeoutHandle = setTimeout(
        () => reject(FileSystemError.Unavailable(uri)),
        timeout * 1000,
      );
      this._eventDict[uuid] = { resolve, reject, uri, timeoutHandle };
      this._socket.emit(VscClientEvent.FSEvent, uuid, type, payload);
    });
  }

  private registerFSEventHandlers() {
    const getFSError = (errorUri: Uri, error: NodeJS.ErrnoException): FileSystemError => {
      console.log('returned error', error);
      if (error.code === 'ENOENT') {
        return FileSystemError.FileNotFound(errorUri);
      }
      if (error.code === 'ENOTDIR') {
        return FileSystemError.FileNotADirectory(errorUri);
      }
      return FileSystemError.Unavailable(errorUri);
    };

    // TO-DO: remove on dispose
    this._socket.on(RunnerClientEvent.FSEvent, (uuid: string, data: unknown) => {
      const event = this._eventDict[uuid];
      if (!event) {
        return;
      }

      clearTimeout(event.timeoutHandle);
      event.resolve(data);
      delete this._eventDict[uuid];
    });
    this._socket.on(
      RunnerClientEvent.FSEventError,
      (uuid: string, error: NodeJS.ErrnoException) => {
        const event = this._eventDict[uuid];
        if (!event) {
          return;
        }

        clearTimeout(event.timeoutHandle);
        event.reject(getFSError(event.uri, error));
        delete this._eventDict[uuid];
      },
    );
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
