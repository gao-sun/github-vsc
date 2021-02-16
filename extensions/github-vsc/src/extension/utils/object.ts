export type Falsy = null | undefined | false | 0 | '';
export type Truthy<T> = Exclude<T, Falsy>;

export const conditionalString = (exp: string | Falsy): string => (exp ? exp : '');

export const conditional = <T>(exp: T | Falsy): Optional<T> => (exp ? exp : undefined);
