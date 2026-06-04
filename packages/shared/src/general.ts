export const isString = (val: unknown) => typeof val === "string";
export const NOOP = (): void => {};

export const extend: typeof Object.assign = Object.assign;
