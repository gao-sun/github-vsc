export const getShortenRef = (ref: string): string => {
  if (!ref.startsWith('refs/')) {
    return ref;
  }
  const [, , ...values] = ref.split('/');
  return values.join('/');
};

export const buildFullRef = (ref: string, type: 'branch' | 'tag'): string => {
  if (ref.startsWith('refs/')) {
    return ref;
  }

  return `refs/${type === 'branch' ? 'heads' : 'tags'}/${ref}`;
};

const prependIfNeeded = (str: string, prefix: string): string =>
  str.startsWith(prefix) ? str : `${prefix}${str}`;

export const buildRef = (ref: string, type: 'branch' | 'tag'): string =>
  prependIfNeeded(getShortenRef(ref), type === 'branch' ? 'heads/' : 'tags/');
