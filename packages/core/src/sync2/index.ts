import { Data } from "effect";

import type { Effect, Schema } from "effect";
import type { AccessControl } from "../access-control2";
import type { Tenant } from "../tenants2/sql";
import type { User } from "../users2/sql";
import type { SyncMutation } from "./shared";

/* eslint-disable @typescript-eslint/no-explicit-any */

// TODO: Implement real session service in another module
interface Session {
  userId: User["id"];
  tenantId: Tenant["id"];
}

export namespace Sync {
  type MakePolicy<
    TMutationArgs extends Schema.Schema.AnyNoContext,
    TError,
    TContext,
  > = (
    mutationArgs: Schema.Schema.Type<TMutationArgs>,
  ) => AccessControl.Policy<TError, TContext>;

  type Mutator<
    TArgs extends Schema.Schema.AnyNoContext,
    TSuccess,
    TError,
    TContext,
  > = (
    args: Schema.Schema.Type<TArgs>,
    session: Session,
  ) => Effect.Effect<TSuccess, TError, TContext>;

  export interface Mutation<
    TName extends string = string,
    TArgs extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
    TPolicyError = any,
    TPolicyContext = any,
    TMutatorSuccess = any,
    TMutatorError = any,
    TMutatorContext = any,
  > extends SyncMutation<TName, TArgs> {
    readonly _tag: "@printdesk/core/sync/Mutation";
    readonly makePolicy: MakePolicy<TArgs, TPolicyError, TPolicyContext>;
    readonly mutator: Mutator<
      TArgs,
      TMutatorSuccess,
      TMutatorError,
      TMutatorContext
    >;
  }

  export const Mutation = <
    TName extends string,
    TArgs extends Schema.Schema.AnyNoContext,
    TPolicyError,
    TPolicyContext,
    TMutatorSuccess,
    TMutatorError,
    TMutatorContext,
  >(
    base: SyncMutation<TName, TArgs>,
    makePolicy: MakePolicy<TArgs, TPolicyError, TPolicyContext>,
    mutator: Mutator<TArgs, TMutatorSuccess, TMutatorError, TMutatorContext>,
  ) =>
    Data.tagged<
      Mutation<
        TName,
        TArgs,
        TPolicyError,
        TPolicyContext,
        TMutatorSuccess,
        TMutatorError,
        TMutatorContext
      >
    >("@printdesk/core/sync/Mutation")({
      ...base,
      makePolicy,
      mutator,
    });
}
