type Optional<T> = T | undefined;
type Dictionary<K extends string | number | symbol, V> = { [key in K]: Optional<V> };

declare const IS_DEV: boolean;
