import type { InferSelectModel, Table } from "drizzle-orm";

export type StartsWith<
  TPrefix extends string,
  TValue extends string,
> = TValue extends `${TPrefix}${string}` ? TValue : never;

export type EndsWith<
  TSuffix extends string,
  TValue extends string,
> = TValue extends `${string}${TSuffix}` ? TValue : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyError = new (...args: Array<any>) => Error;

export type CustomError<TError extends AnyError> = {
  Error: TError;
  args: ConstructorParameters<TError>;
};

export type InferCustomError<TCustomError> =
  TCustomError extends CustomError<infer TError> ? CustomError<TError> : never;

export type NonNullableProperties<TInput> = {
  [TKey in keyof TInput]: NonNullable<TInput[TKey]>;
};

export type PartialExcept<
  TInput extends object,
  TKey extends keyof TInput,
> = Partial<Omit<TInput, TKey>> & Pick<TInput, TKey>;

export type InferTable<TTable extends Table> = Omit<
  InferSelectModel<TTable>,
  "version"
>;
