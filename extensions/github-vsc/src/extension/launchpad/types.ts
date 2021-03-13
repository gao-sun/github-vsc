import { RepoData } from '@src/core/types/foundation';

export type RepoDataUpdateHandler = (repoData?: RepoData) => Promise<unknown>;
