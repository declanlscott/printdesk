import { Data } from "effect";

import type { Schema } from "effect";
import type { Tenant } from "../tenants2/sql";
import type { User } from "../users2/sql";

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

// TODO: Implement real session service in another module
export interface Session {
  userId: User["id"];
  tenantId: Tenant["id"];
}
