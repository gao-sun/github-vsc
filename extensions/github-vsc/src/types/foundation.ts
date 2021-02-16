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
};

export type VSCodeData = {
  userContext?: UserContext;
  repoData?: RepoData;
};
