import { GitHubRef } from '@src/types/foundation';
import { FileStat, FileType, Uri } from 'vscode';

export type Entry = File | Directory;

export type EntryMap = Map<string, Entry>;

export type GitHubLocation = GitHubRef & {
  uri: Uri;
};

export class File implements FileStat {
  type: FileType;
  ctime: number;
  mtime: number;
  size: number;
  name: string;
  uri: Uri;
  sha: string;
  mode: GitFileMode;
  data?: Uint8Array;

  constructor(
    uri: Uri,
    name: string,
    sha: string,
    mode: GitFileMode,
    size?: number,
    ctime?: number,
    mtime?: number,
  ) {
    this.type = FileType.File;
    this.ctime = ctime ?? Date.now();
    this.mtime = mtime ?? Date.now();
    this.size = size ?? 0;
    this.name = name;
    this.uri = uri;
    this.sha = sha;
    this.mode = mode;
  }
}

export class Directory implements FileStat {
  type: FileType;
  ctime: number;
  mtime: number;
  size: number;
  name: string;
  sha: string;
  mode: GitFileMode;
  uri: Uri;

  constructor(
    uri: Uri,
    name: string,
    sha: string,
    mode: GitFileMode,
    size?: number,
    ctime?: number,
    mtime?: number,
  ) {
    this.type = FileType.Directory;
    this.ctime = ctime ?? Date.now();
    this.mtime = mtime ?? Date.now();
    this.size = size ?? 0;
    this.name = name;
    this.sha = sha;
    this.mode = mode;
    this.uri = uri;
  }
}

export enum GitFileMode {
  File = '100644',
  ExecutableFile = '100755',
  Tree = '040000',
  Commit = '160000',
  Symlink = '120000',
}

export enum GitFileType {
  File = 'blob',
  Tree = 'tree',
  Commit = 'commit',
}
