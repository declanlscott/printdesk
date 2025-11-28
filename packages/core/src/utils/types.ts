import type * as Schema from "effect/Schema";

export type Prettify<TObject> = {
  [TKey in keyof TObject]: TObject[TKey];
} & {};

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
  TObject extends object,
  TKey extends keyof TObject,
> = Partial<Omit<TObject, TKey>> & Pick<TObject, TKey>;

export type RequiredExcept<
  TObject extends object,
  TKey extends keyof TObject,
> = Required<Omit<TObject, TKey>> & Partial<Pick<TObject, TKey>>;

export type Discriminate<
  TEntity,
  TKey extends keyof TEntity,
  TValue extends TEntity[TKey],
> = Omit<TEntity, TKey> & Record<TKey, TValue>;

export interface SchemaAndValue<TValue extends Schema.Schema.Any> {
  schema: TValue;
  value: TValue["Type"];
}
