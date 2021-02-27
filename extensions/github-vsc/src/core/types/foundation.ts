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
  sessionDict: Dictionary<string, SessionData>;
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

export enum SessionOS {
  Ubuntu = 'Ubuntu',
  macOS = 'macOS',
  Windows = 'Windows',
}

export type SessionData = {
  githubRef?: GitHubRef;
  sessionId?: string;
  serverAddress: string;
  os?: SessionOS;
  defaultShell?: string;
};
