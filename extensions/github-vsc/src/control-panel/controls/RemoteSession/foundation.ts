import { RepoData, SessionData, UserContext } from '@core/types/foundation';

export type Props = {
  repoData?: RepoData;
  sessionData?: SessionData;
  userContext?: UserContext;
};

export enum SessionMethod {
  StartNew = 'Start',
  Resume = 'Resume',
}

export type SessionOption = {
  value: SessionMethod;
  message: string;
};

export const sessionOptions: readonly SessionOption[] = Object.freeze([
  { value: SessionMethod.StartNew, message: 'Start a new session.' },
  { value: SessionMethod.Resume, message: 'Resume an existing session.' },
]);
