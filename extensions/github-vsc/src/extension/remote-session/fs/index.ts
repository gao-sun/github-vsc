import { Disposable, EventEmitter, FileChangeEvent, FileSystemProvider, Uri } from 'vscode';

export class RemoteSessionFS implements FileSystemProvider {
  static scheme = 'rs-fs';
  static rootUri = Uri.parse(`${RemoteSessionFS.scheme}:/`);

  // MARK: FileSystemProvider implmentations
  watch(): Disposable {
    // ignore, fires for all changes...
    return new Disposable(() => {});
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
