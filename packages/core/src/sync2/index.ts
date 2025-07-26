/* eslint-disable @typescript-eslint/no-explicit-any */
import { Array, Cause, Chunk, Data, Effect } from "effect";

import { AccessControl } from "../access-control2";

import type { Schema } from "effect";
import type { SyncTableName } from "../database2/tables";
import type { Tenant } from "../tenants2/sql";
import type { User } from "../users2/sql";
import type { SyncMutation } from "./shared";

// TODO: Implement real session service in another module
interface Session {
  userId: User["id"];
  tenantId: Tenant["id"];
}

export namespace Sync {
  export interface Metadata {
    readonly id: string;
    readonly version: number;
  }

  export interface Query<TTableName extends SyncTableName> {
    readonly tableName: TTableName;
    readonly query: () => void;
    readonly fetch: () => void;
  }

  export function metadata<
    TPolicyError,
    TPolicyContext,
    TQueryError,
    TQueryContext,
  >(
    ...queries: Array.NonEmptyReadonlyArray<{
      policy: AccessControl.Policy<TPolicyError, TPolicyContext>;
      query: () => Effect.Effect<Array<Metadata>, TQueryError, TQueryContext>;
    }>
  ) {
    const effects = Chunk.fromIterable(
      Array.map(queries, ({ query, policy }) =>
        query().pipe(AccessControl.enforce(policy)),
      ),
    );
    if (!Chunk.isNonEmpty(effects))
      return Effect.dieSync(
        () =>
          new Cause.IllegalArgumentException(
            `Received an empty collection of metadata queries`,
          ),
      );

    return Chunk.tailNonEmpty(effects).pipe(
      Array.reduce(Chunk.headNonEmpty(effects), (left, right) =>
        left.pipe(Effect.catchTag("AccessDeniedError", () => right)),
      ),
      Effect.catchTag("AccessDeniedError", () =>
        Effect.succeed(Array.empty<Metadata>()),
      ),
    );
  }

  type MakePolicy<
    TSchema extends Schema.Schema.AnyNoContext,
    TError,
    TContext,
  > = (
    data: Schema.Schema.Type<TSchema>,
  ) => AccessControl.Policy<TError, TContext>;

  type Mutator<
    TSchema extends Schema.Schema.AnyNoContext,
    TSuccess,
    TError,
    TContext,
  > = (
    data: Schema.Schema.Type<TSchema>,
    session: Session,
  ) => Effect.Effect<TSuccess, TError, TContext>;

  export interface Mutation<
    TName extends string = string,
    TSchema extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
    TPolicyError = any,
    TPolicyContext = any,
    TMutatorSuccess = any,
    TMutatorError = any,
    TMutatorContext = any,
  > extends SyncMutation<TName, TSchema> {
    readonly _tag: "@printdesk/core/sync/Mutation";
    readonly makePolicy: MakePolicy<TSchema, TPolicyError, TPolicyContext>;
    readonly mutator: Mutator<
      TSchema,
      TMutatorSuccess,
      TMutatorError,
      TMutatorContext
    >;
  }

  export const Mutation = <
    TName extends string,
    TSchema extends Schema.Schema.AnyNoContext,
    TPolicyError,
    TPolicyContext,
    TMutatorSuccess,
    TMutatorError,
    TMutatorContext,
  >(
    base: SyncMutation<TName, TSchema>,
    makePolicy: MakePolicy<TSchema, TPolicyError, TPolicyContext>,
    mutator: Mutator<TSchema, TMutatorSuccess, TMutatorError, TMutatorContext>,
  ) =>
    Data.tagged<
      Mutation<
        TName,
        TSchema,
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
