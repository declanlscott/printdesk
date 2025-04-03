import { customAlphabet } from "nanoid";
import * as R from "remeda";
import * as v from "valibot";

import { Constants } from "./constants";

import type {
  AnyError,
  CustomError,
  InferCustomError,
  StartsWith,
} from "./types";

export function parseResource<TResource extends Record<string, unknown>>(
  prefix: string,
  input: Record<string, string | undefined>,
): TResource {
  const raw: Record<string, unknown> = {};
  for (const key in input) {
    const value = input[key];

    if (key.startsWith(prefix) && value)
      raw[key.slice(prefix.length)] = JSON.parse(value);
  }

  return new Proxy(raw, {
    get(target, prop: string) {
      if (prop in target) return target[prop];

      throw new Error(`Resource "${prop}" is not linked.`);
    },
  }) as TResource;
}

export const generateId = customAlphabet(
  Constants.NANOID_CUSTOM_ALPHABET,
  Constants.NANOID_LENGTH,
);

export const formatPascalCase = (value: string) =>
  value.replace(/([a-z])([A-Z])/g, "$1 $2");

export const fn = <
  TSchema extends v.GenericSchema,
  TCallback extends (output: v.InferOutput<TSchema>) => ReturnType<TCallback>,
  TMaybeError extends AnyError | undefined,
>(
  schema: TSchema,
  callback: TCallback,
  customError?: TMaybeError extends AnyError
    ? InferCustomError<CustomError<TMaybeError>>
    : never,
) =>
  Object.assign(
    <TInput>(input: TInput) => {
      let output: v.InferOutput<TSchema>;
      try {
        output = v.parse(schema, input);
      } catch (e) {
        if (v.isValiError<TSchema>(e) && customError)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          throw new customError.Error(...customError.args);

        throw e;
      }

      return callback(output);
    },
    { schema },
  );

export const isUniqueByKey = <
  TKey extends keyof TInput[number],
  TInput extends Array<Record<TKey, string>>,
>(
  key: TKey,
  input: TInput,
) =>
  R.pipe(
    input,
    R.uniqueBy(R.prop(key)),
    R.length(),
    R.isDeepEqual(input.length),
  );

export const isSingleton = <TElement, TInput extends ArrayLike<TElement>>(
  input: TInput,
) => R.pipe(input, R.length(), R.isDeepEqual(1));

export const nanoIdSchema = v.pipe(v.string(), v.regex(Constants.NANOID_REGEX));
export type NanoId = v.InferOutput<typeof nanoIdSchema>;

export const timestampsSchema = v.object({
  createdAt: v.date(),
  updatedAt: v.date(),
  deletedAt: v.nullable(v.date()),
});

export const tenantTableSchema = v.object({
  id: nanoIdSchema,
  tenantId: nanoIdSchema,
  ...timestampsSchema.entries,
});

export const costSchema = v.pipe(
  v.union([v.number(), v.pipe(v.string(), v.decimal())]),
  v.transform(Number),
);

export const objectsTuple = <const TObjects extends Array<v.ObjectEntries>>(
  ...objects: TObjects
): v.TupleSchema<
  {
    [K in keyof TObjects]: v.ObjectSchema<TObjects[K], undefined>;
  },
  undefined
> => v.tuple(R.map(objects, (entries) => v.object(entries)));

export const buildUrl = <TPath extends string>({
  protocol = "https:",
  fqdn,
  path,
}: {
  protocol?: string;
  fqdn: string;
  path: StartsWith<"/", TPath>;
}) => new URL(`${protocol}//${fqdn}${path}`);
