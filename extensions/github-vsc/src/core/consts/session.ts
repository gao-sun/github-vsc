import { SessionOS } from '../types/foundation';

export const defaultShell: Record<SessionOS, string> = {
  [SessionOS.Ubuntu]: 'bash',
  [SessionOS.macOS]: 'zsh',
  [SessionOS.Windows]: 'PowerShell.exe',
};
