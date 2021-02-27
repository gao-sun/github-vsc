import { GitHubRef } from '../types/foundation';

export const getRefKey = (ref?: GitHubRef): string =>
  ref ? `${ref.owner}/${ref.repo}:${ref.ref}` : '*';
