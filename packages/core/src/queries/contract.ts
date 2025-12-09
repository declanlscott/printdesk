/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Array from "effect/Array";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as HashSet from "effect/HashSet";
import * as Iterable from "effect/Iterable";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";

import { AccessControl } from "../access-control";

import type { ActorsContract } from "../actors/contract";
import type { ColumnsContract } from "../columns/contract";
import type { Models } from "../models";
import type { ReplicacheClientViewsModel } from "../replicache/models";

export namespace QueriesContract {
  export type VersionedDto<TEntity extends Models.SyncTableName> =
    Models.SyncTableByName<TEntity>["DataTransferObject"]["Type"] & {
      version: ColumnsContract.Version;
    };

  export interface DifferenceQuery<
    TEntity extends Models.SyncTableName = Models.SyncTableName,
    TPolicyError = any,
    TPolicyContext = any,
    TCreatesError = any,
    TCreatesContext = any,
    TUpdatesError = any,
    TUpdatesContext = any,
    TDeletesError = any,
    TDeletesContext = any,
    TFastForwardError = any,
    TFastForwardContext = any,
  > {
    readonly entity: TEntity;
    readonly policy: AccessControl.Policy<TPolicyError, TPolicyContext>;
    readonly findCreates: (
      clientView: ReplicacheClientViewsModel.Record,
      userId: ActorsContract.User["id"],
    ) => Effect.Effect<
      Array<VersionedDto<TEntity>>,
      TCreatesError,
      TCreatesContext
    >;
    readonly findUpdates: (
      clientView: ReplicacheClientViewsModel.Record,
      userId: ActorsContract.User["id"],
    ) => Effect.Effect<
      Array<VersionedDto<TEntity>>,
      TUpdatesError,
      TUpdatesContext
    >;
    readonly findDeletes: (
      clientView: ReplicacheClientViewsModel.Record,
      userId: ActorsContract.User["id"],
    ) => Effect.Effect<
      Array<Pick<VersionedDto<TEntity>, "id">>,
      TDeletesError,
      TDeletesContext
    >;
    readonly fastForward: (
      clientView: ReplicacheClientViewsModel.Record,
      excludeIds: Array<VersionedDto<TEntity>["id"]>,
      userId: ActorsContract.User["id"],
    ) => Effect.Effect<
      Array<VersionedDto<TEntity>>,
      TFastForwardError,
      TFastForwardContext
    >;
  }

  export interface DifferenceResolver<
    TEntity extends Models.SyncTableName = Models.SyncTableName,
    TPolicyError = any,
    TPolicyContext = any,
    TCreatesError = any,
    TCreatesContext = any,
    TUpdatesError = any,
    TUpdatesContext = any,
    TDeletesError = any,
    TDeletesContext = any,
    TFastForwardError = any,
    TFastForwardContext = any,
  > {
    readonly entity: TEntity;
    readonly findCreates: (
      clientView: ReplicacheClientViewsModel.Record,
      userId: ActorsContract.User["id"],
    ) => Stream.Stream<
      VersionedDto<TEntity>,
      TCreatesError | Exclude<TPolicyError, AccessControl.AccessDeniedError>,
      TCreatesContext | TPolicyContext
    >;
    readonly findUpdates: (
      clientView: ReplicacheClientViewsModel.Record,
      userId: ActorsContract.User["id"],
    ) => Stream.Stream<
      VersionedDto<TEntity>,
      TUpdatesError | Exclude<TPolicyError, AccessControl.AccessDeniedError>,
      TUpdatesContext | TPolicyContext
    >;
    readonly findDeletes: (
      clientView: ReplicacheClientViewsModel.Record,
      userId: ActorsContract.User["id"],
    ) => Stream.Stream<
      VersionedDto<TEntity>["id"],
      TDeletesError | Exclude<TPolicyError, AccessControl.AccessDeniedError>,
      TDeletesContext | TPolicyContext
    >;
    readonly fastForward: (
      clientView: ReplicacheClientViewsModel.Record,
      excludeIds: Chunk.Chunk<VersionedDto<TEntity>["id"]>,
      userId: ActorsContract.User["id"],
    ) => Stream.Stream<
      VersionedDto<TEntity>,
      | TFastForwardError
      | Exclude<TPolicyError, AccessControl.AccessDeniedError>,
      TFastForwardContext | TPolicyContext
    >;
  }

  export class DifferenceResolverBuilder<
    TEntity extends Models.SyncTableName,
    TQuery extends DifferenceQuery<TEntity> | null = null,
  > {
    constructor(readonly entity: TEntity) {}

    #queries = Iterable.empty<Omit<DifferenceQuery<TEntity>, "entity">>();

    readonly QueryType = {} as DifferenceQuery<
      TEntity,
      Effect.Effect.Error<NonNullable<TQuery>["policy"]>,
      Effect.Effect.Context<NonNullable<TQuery>["policy"]>,
      Effect.Effect.Error<ReturnType<NonNullable<TQuery>["findCreates"]>>,
      Effect.Effect.Context<ReturnType<NonNullable<TQuery>["findCreates"]>>,
      Effect.Effect.Error<ReturnType<NonNullable<TQuery>["findUpdates"]>>,
      Effect.Effect.Context<ReturnType<NonNullable<TQuery>["findUpdates"]>>,
      Effect.Effect.Error<ReturnType<NonNullable<TQuery>["findDeletes"]>>,
      Effect.Effect.Context<ReturnType<NonNullable<TQuery>["findDeletes"]>>,
      Effect.Effect.Error<ReturnType<NonNullable<TQuery>["fastForward"]>>,
      Effect.Effect.Context<ReturnType<NonNullable<TQuery>["fastForward"]>>
    >;

    query<
      TPolicyError,
      TPolicyContext,
      TCreatesError,
      TCreatesContext,
      TUpdatesError,
      TUpdatesContext,
      TDeletesError,
      TDeletesContext,
      TFastForwardError,
      TFastForwardContext,
    >(
      policy: AccessControl.Policy<TPolicyError, TPolicyContext>,
      functions: Omit<
        DifferenceQuery<
          TEntity,
          TPolicyError,
          TPolicyContext,
          TCreatesError,
          TCreatesContext,
          TUpdatesError,
          TUpdatesContext,
          TDeletesError,
          TDeletesContext,
          TFastForwardError,
          TFastForwardContext
        >,
        "entity" | "policy"
      >,
    ) {
      this.#queries = Iterable.append(this.#queries, {
        policy,
        ...functions,
      });

      return this as DifferenceResolverBuilder<
        TEntity,
        NonNullable<
          | TQuery
          | DifferenceQuery<
              TEntity,
              TPolicyError,
              TPolicyContext,
              TCreatesError,
              TCreatesContext,
              TUpdatesError,
              TUpdatesContext,
              TDeletesError,
              TDeletesContext,
              TFastForwardError,
              TFastForwardContext
            >
        >
      >;
    }

    build = () =>
      ({
        findCreates: this.#findCreates,
        findUpdates: this.#findUpdates,
        findDeletes: this.#findDeletes,
        fastForward: this.#fastForward,
      }) as DifferenceResolver<
        TEntity,
        Effect.Effect.Error<NonNullable<TQuery>["policy"]>,
        Effect.Effect.Context<NonNullable<TQuery>["policy"]>,
        Effect.Effect.Error<ReturnType<NonNullable<TQuery>["findCreates"]>>,
        Effect.Effect.Context<ReturnType<NonNullable<TQuery>["findCreates"]>>,
        Effect.Effect.Error<ReturnType<NonNullable<TQuery>["findUpdates"]>>,
        Effect.Effect.Context<ReturnType<NonNullable<TQuery>["findUpdates"]>>,
        Effect.Effect.Error<ReturnType<NonNullable<TQuery>["findDeletes"]>>,
        Effect.Effect.Context<ReturnType<NonNullable<TQuery>["findDeletes"]>>,
        Effect.Effect.Error<ReturnType<NonNullable<TQuery>["fastForward"]>>,
        Effect.Effect.Context<ReturnType<NonNullable<TQuery>["fastForward"]>>
      >;

    #resolveData = <TData extends VersionedDto<TEntity>, TError, TContext>(
      effects: Iterable<
        Effect.Effect<
          Array<TData>,
          TError | AccessControl.AccessDeniedError,
          TContext
        >
      >,
    ) =>
      Effect.suspend(() =>
        HashMap.empty<TData["id"], TData>().pipe(HashMap.beginMutation, (map) =>
          Effect.all(
            Iterable.map(effects, (effect) =>
              effect.pipe(
                Effect.catchTag("AccessDeniedError", () =>
                  Effect.sync(Array.empty<TData>),
                ),
                Effect.map(
                  Array.map((data) => map.pipe(HashMap.set(data.id, data))),
                ),
              ),
            ),
            { concurrency: "unbounded", discard: true },
          ).pipe(
            Effect.map(() => map.pipe(HashMap.endMutation)),
            Effect.map(HashMap.values),
          ),
        ),
      ).pipe(Stream.fromIterableEffect);

    #resolveIds = <
      TData extends Pick<VersionedDto<TEntity>, "id">,
      TError,
      TContext,
    >(
      effects: Iterable<
        Effect.Effect<
          Array<TData>,
          TError | AccessControl.AccessDeniedError,
          TContext
        >
      >,
    ) =>
      Effect.suspend(() =>
        HashSet.empty<TData["id"]>().pipe(HashSet.beginMutation, (set) =>
          Effect.all(
            Iterable.map(effects, (effect) =>
              effect.pipe(
                Effect.catchTag("AccessDeniedError", () =>
                  Effect.sync(Array.empty<TData>),
                ),
                Effect.map(Array.map((data) => set.pipe(HashSet.add(data.id)))),
              ),
            ),
            { concurrency: "unbounded", discard: true },
          ).pipe(
            Effect.map(() => set.pipe(HashSet.endMutation)),
            Effect.map(HashSet.values),
          ),
        ),
      ).pipe(Stream.fromIterableEffect);

    #findCreates = (
      clientView: ReplicacheClientViewsModel.Record,
      userId: ActorsContract.User["id"],
    ) =>
      this.#resolveData(
        Iterable.map(this.#queries, (q) => {
          const query = q as typeof this.QueryType;

          return query
            .findCreates(clientView, userId)
            .pipe(AccessControl.enforce(query.policy));
        }),
      );

    #findUpdates = (
      clientView: ReplicacheClientViewsModel.Record,
      userId: ActorsContract.User["id"],
    ) =>
      this.#resolveData(
        Iterable.map(this.#queries, (q) => {
          const query = q as typeof this.QueryType;

          return query
            .findUpdates(clientView, userId)
            .pipe(AccessControl.enforce(query.policy));
        }),
      );

    #findDeletes = (
      clientView: ReplicacheClientViewsModel.Record,
      userId: ActorsContract.User["id"],
    ) =>
      this.#resolveIds(
        Iterable.map(this.#queries, (q) => {
          const query = q as typeof this.QueryType;

          return query
            .findDeletes(clientView, userId)
            .pipe(AccessControl.enforce(query.policy));
        }),
      );

    #fastForward = (
      clientView: ReplicacheClientViewsModel.Record,
      excludeIds: Chunk.Chunk<
        Models.SyncTable["DataTransferObject"]["Type"]["id"]
      >,
      userId: ActorsContract.User["id"],
    ) =>
      this.#resolveData(
        Iterable.map(this.#queries, (q) => {
          const query = q as typeof this.QueryType;

          return query
            .fastForward(clientView, excludeIds.pipe(Chunk.toArray), userId)
            .pipe(AccessControl.enforce(query.policy));
        }),
      );
  }

  export class Differentiator<
    TRecord extends {
      [TEntity in Models.SyncTableName]?: DifferenceResolver<TEntity>;
      // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    } = {},
    TIsFinal extends boolean = false,
  > {
    #isFinal = false;
    #map = HashMap.empty<
      DifferenceResolver["entity"],
      DifferenceResolver<any>
    >();

    resolver<
      TEntity extends Models.SyncTableName,
      TPolicyError,
      TPolicyContext,
      TCreatesError,
      TCreatesContext,
      TUpdatesError,
      TUpdatesContext,
      TDeletesError,
      TDeletesContext,
      TFastForwardError,
      TFastForwardContext,
    >(
      this: TIsFinal extends false ? Differentiator<TRecord, TIsFinal> : never,
      resolver: DifferenceResolver<
        TEntity,
        TPolicyError,
        TPolicyContext,
        TCreatesError,
        TCreatesContext,
        TUpdatesError,
        TUpdatesContext,
        TDeletesError,
        TDeletesContext,
        TFastForwardError,
        TFastForwardContext
      >,
    ) {
      if (!this.#isFinal)
        this.#map = HashMap.set(this.#map, resolver.entity, resolver);

      return this as Differentiator<
        TRecord &
          Record<
            TEntity,
            DifferenceResolver<
              TEntity,
              TPolicyError,
              TPolicyContext,
              TCreatesError,
              TCreatesContext,
              TUpdatesError,
              TUpdatesContext,
              TDeletesError,
              TDeletesContext,
              TFastForwardError,
              TFastForwardContext
            >
          >
      >;
    }

    final(
      this: TRecord extends {
        [TEntity in Models.SyncTableName]: DifferenceResolver<TEntity>;
      }
        ? Differentiator<TRecord, TIsFinal>
        : never,
    ) {
      this.#isFinal = true;

      return this as Differentiator<TRecord, true>;
    }

    findCreates(
      this: TRecord extends {
        [TEntity in Models.SyncTableName]: DifferenceResolver<TEntity>;
      }
        ? Differentiator<TRecord, TIsFinal>
        : never,
      clientView: ReplicacheClientViewsModel.Record,
      userId: ActorsContract.User["id"],
    ) {
      return this.#map.pipe(
        HashMap.entries,
        Iterable.map(([entity, resolver]) =>
          resolver
            .findCreates(clientView, userId)
            .pipe(Stream.map((data) => ({ entity, data }))),
        ),
        Stream.mergeAll({ concurrency: "unbounded" }),
      ) as Stream.Stream<
        {
          [TEntity in Models.SyncTableName]: {
            entity: TEntity;
            data: Stream.Stream.Success<
              ReturnType<NonNullable<TRecord[TEntity]>["findCreates"]>
            >;
          };
        }[Models.SyncTableName],
        Stream.Stream.Error<
          ReturnType<NonNullable<TRecord[Models.SyncTableName]>["findCreates"]>
        >,
        Stream.Stream.Context<
          ReturnType<NonNullable<TRecord[Models.SyncTableName]>["findCreates"]>
        >
      >;
    }

    findUpdates(
      this: TRecord extends {
        [TEntity in Models.SyncTableName]: DifferenceResolver<TEntity>;
      }
        ? Differentiator<TRecord, TIsFinal>
        : never,
      clientView: ReplicacheClientViewsModel.Record,
      userId: ActorsContract.User["id"],
    ) {
      return this.#map.pipe(
        HashMap.entries,
        Iterable.map(([entity, resolver]) =>
          resolver
            .findUpdates(clientView, userId)
            .pipe(Stream.map((data) => ({ entity, data }))),
        ),
        Stream.mergeAll({ concurrency: "unbounded" }),
      ) as Stream.Stream<
        {
          [TEntity in Models.SyncTableName]: {
            entity: TEntity;
            data: Stream.Stream.Success<
              ReturnType<NonNullable<TRecord[TEntity]>["findUpdates"]>
            >;
          };
        }[Models.SyncTableName],
        Stream.Stream.Error<
          ReturnType<NonNullable<TRecord[Models.SyncTableName]>["findUpdates"]>
        >,
        Stream.Stream.Context<
          ReturnType<NonNullable<TRecord[Models.SyncTableName]>["findUpdates"]>
        >
      >;
    }

    findDeletes(
      this: TRecord extends {
        [TEntity in Models.SyncTableName]: DifferenceResolver<TEntity>;
      }
        ? Differentiator<TRecord, TIsFinal>
        : never,
      clientView: ReplicacheClientViewsModel.Record,
      userId: ActorsContract.User["id"],
    ) {
      return this.#map.pipe(
        HashMap.entries,
        Iterable.map(([entity, resolver]) =>
          resolver
            .findDeletes(clientView, userId)
            .pipe(Stream.map((id) => ({ entity, id }))),
        ),
        Stream.mergeAll({ concurrency: "unbounded" }),
      ) as Stream.Stream<
        {
          [TEntity in Models.SyncTableName]: {
            entity: TEntity;
            id: Stream.Stream.Success<
              ReturnType<NonNullable<TRecord[TEntity]>["findDeletes"]>
            >;
          };
        }[Models.SyncTableName],
        Stream.Stream.Error<
          ReturnType<NonNullable<TRecord[Models.SyncTableName]>["findDeletes"]>
        >,
        Stream.Stream.Context<
          ReturnType<NonNullable<TRecord[Models.SyncTableName]>["findDeletes"]>
        >
      >;
    }

    fastForward(
      this: TRecord extends {
        [TEntity in Models.SyncTableName]: DifferenceResolver<TEntity>;
      }
        ? Differentiator<TRecord, TIsFinal>
        : never,
      clientView: ReplicacheClientViewsModel.Record,
      excludes: Chunk.Chunk<{
        entity: Models.SyncTableName;
        id: Models.SyncTable["DataTransferObject"]["Type"]["id"];
      }>,
      userId: ActorsContract.User["id"],
    ) {
      return this.#map.pipe(
        HashMap.entries,
        Iterable.map(([entity, resolver]) =>
          resolver
            .fastForward(
              clientView,
              excludes.pipe(
                Chunk.filterMap((exclude) =>
                  exclude.entity === entity
                    ? Option.some(exclude.id)
                    : Option.none(),
                ),
              ),
              userId,
            )
            .pipe(Stream.map((data) => ({ entity, data }))),
        ),
        Stream.mergeAll({ concurrency: "unbounded" }),
      ) as Stream.Stream<
        {
          [TEntity in Models.SyncTableName]: {
            entity: TEntity;
            data: Stream.Stream.Success<
              ReturnType<NonNullable<TRecord[TEntity]>["fastForward"]>
            >;
          };
        }[Models.SyncTableName],
        Stream.Stream.Error<
          ReturnType<NonNullable<TRecord[Models.SyncTableName]>["fastForward"]>
        >,
        Stream.Stream.Context<
          ReturnType<NonNullable<TRecord[Models.SyncTableName]>["fastForward"]>
        >
      >;
    }
  }
}
