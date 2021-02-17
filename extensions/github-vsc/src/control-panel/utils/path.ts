import { Uri } from 'vscode';

export const getFileName = (uri: Uri): string => {
  const index = uri.path.lastIndexOf('/');
  return index > -1 ? uri.path.slice(index + 1) : uri.path;
};
