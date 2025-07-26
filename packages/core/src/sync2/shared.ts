import { Data } from "effect";

import type { Schema } from "effect";

export interface SyncMutation<
  TName extends string,
  TSchema extends Schema.Schema.Any,
> {
  readonly name: TName;
  readonly Schema: TSchema;
}

export const SyncMutation = <
  TName extends string,
  TSchema extends Schema.Schema.Any,
>(
  name: TName,
  Schema: TSchema,
) => Data.case<SyncMutation<TName, TSchema>>()({ name, Schema });
