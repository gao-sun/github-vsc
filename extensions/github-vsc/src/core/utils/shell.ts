export const getDefaultShell = (os?: string): string => {
  if (os?.toLocaleLowerCase().startsWith('mac')) {
    return 'zsh';
  }

  if (os?.toLocaleLowerCase().startsWith('windows')) {
    return 'PowerShell.exe';
  }

  return 'bash';
};
