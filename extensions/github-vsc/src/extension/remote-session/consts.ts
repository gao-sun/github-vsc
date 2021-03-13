import { RunnerError } from './types';

export const runnerErrorMesage: Record<RunnerError, string> = {
  [RunnerError.Timeout]: 'Connection timeout. Please try another runner.',
  [RunnerError.SessionTerminated]:
    'The session is not available in the runner or it has been terminated, please ensure you chose the correct runner server or create a new session if needed.',
  [RunnerError.SessionIdDoesNotMatch]:
    "The registered session ID for this client doesn't match. Please check your input.",
};
