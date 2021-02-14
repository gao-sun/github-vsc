import { FileStat, FileType, Uri } from 'vscode';

export type Entry = File | Directory;

export type EntryMap = Map<string, Entry>;

export type GitHubLocation = {
  owner: string;
  repo: string;
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
  data?: Uint8Array;

  constructor(uri: Uri, name: string, sha: string, size?: number, ctime?: number, mtime?: number) {
    this.type = FileType.File;
    this.ctime = ctime ?? Date.now();
    this.mtime = mtime ?? Date.now();
    this.size = size ?? 0;
    this.name = name;
    this.uri = uri;
    this.sha = sha;
  }
}

export class Directory implements FileStat {
  type: FileType;
  ctime: number;
  mtime: number;
  size: number;
  name: string;
  sha: string;
  uri: Uri;

  constructor(uri: Uri, name: string, sha: string, size?: number, ctime?: number, mtime?: number) {
    this.type = FileType.Directory;
    this.ctime = ctime ?? Date.now();
    this.mtime = mtime ?? Date.now();
    this.size = size ?? 0;
    this.name = name;
    this.sha = sha;
    this.uri = uri;
  }
}
