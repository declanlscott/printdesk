/**
 * NOTE: This module provides shared utility functions and must remain framework-agnostic.
 * For example it should not depend on sst for linked resources. Other modules in the
 * core package may depend on sst, but this module should not.
 */

import { customAlphabet } from "nanoid";
import * as R from "remeda";
import * as v from "valibot";

import { Constants } from "./constants";

import type { AnyError, CustomError, InferCustomError } from "./types";

export const generateId = customAlphabet(
  Constants.NANOID_CUSTOM_ALPHABET,
  Constants.NANOID_LENGTH,
);

export const formatPascalCase = (value: string) =>
  value.replace(/([a-z])([A-Z])/g, "$1 $2");

export const fn =
  <
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
  (input: unknown) => {
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
  };

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

export const nanoIdSchema = v.pipe(
  v.string(),
  v.regex(Constants.NANOID_PATTERN),
);
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

export const papercutAccountIdSchema = v.pipe(
  v.string(),
  v.transform((input) => BigInt(input).toString()),
);

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
