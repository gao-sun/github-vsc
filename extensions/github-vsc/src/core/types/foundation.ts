import { Uri } from 'vscode';

export type GitHubRef = {
  owner: string;
  repo: string;
  ref: string;
};

export type UserContext = {
  pat: string;
  login: string;
  id: number;
  avatarUrl: string;
};

export type RepoData = {
  ref?: GitHubRef;
  permission?: string;
  commitMessage?: string;
  changedFiles: Uri[];
};

export type VSCodeData = {
  userContext?: UserContext;
  repoData?: RepoData;
};

export enum CommitMethod {
  Commit = 'commit',
  PR = 'pr',
  Fork = 'fork',
}

export type TerminalData = {
  terminalId: string;
  data: string | Uint8Array;
};

export type SessionData = {
  id: string;
  terminalIds: string[];
};