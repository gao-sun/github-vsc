import { RunnerClientOS } from '@github-vsc-runner/core';

export const defaultShell: Record<RunnerClientOS, string> = {
  [RunnerClientOS.Ubuntu_18_04]: 'bash',
  [RunnerClientOS.Ubuntu_20_04]: 'bash',
  [RunnerClientOS.macOS_10_15]: 'zsh',
  [RunnerClientOS.macOS_11_0]: 'zsh',
};
