import { Data } from "effect";

import type { Schema } from "effect";

export interface SyncMutation<
  TName extends string,
  TArgs extends Schema.Schema.Any,
> {
  readonly name: TName;
  readonly Args: TArgs;
}

export const SyncMutation = <
  TName extends string,
  TArgs extends Schema.Schema.Any,
>(
  name: TName,
  Args: TArgs,
) => Data.case<SyncMutation<TName, TArgs>>()({ name, Args });
