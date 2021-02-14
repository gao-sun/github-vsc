const init = (): void => {
  Array.prototype.compact = function <T>(this: T[]): NonNullable<T[]> {
    return this.filter((value) => value !== undefined && value !== null);
  };
};

export default init;
