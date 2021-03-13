export enum RunnerStatus {
  Initial = 'Initial',
  Disconnected = 'Disconnected',
  Connecting = 'Connecting',
  Connected = 'Connected',
  SessionStarted = 'SessionStarted',
}

export enum RunnerError {
  Timeout = 'Timeout',
  SessionTerminated = 'SessionTerminated',
  SessionIdDoesNotMatch = 'SessionIdDoesNotMatch',
}
