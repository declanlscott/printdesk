// oxlint-disable typescript/no-explicit-any
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Iterable from "effect/Iterable";
import * as MutableHashMap from "effect/MutableHashMap";
import * as MutableHashSet from "effect/MutableHashSet";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as SynchronizedRef from "effect/SynchronizedRef";

import { AccessControl } from "../access-control";

import type { ActorsContract } from "../actors/contract";
import type { Models } from "../models";
import type { ReplicacheClientViewsModel } from "../replicache/models";
import type { Version } from "../utils";

export namespace SyncContract {
  export class SyncLimitExceededError extends Schema.TaggedErrorClass<SyncLimitExceededError>()(
    "SyncLimitExceededError",
    {},
  ) {}

  export type VersionedEntityDto<TEntity extends Models.SyncTableName> =
    Models.SyncTableByName<TEntity>["Dto"]["Type"] & {
      version: Version;
    };

  export interface EntitySource<
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
      clientView: typeof ReplicacheClientViewsModel.Table.Model.Type,
      userId: ActorsContract.UserActor["id"],
    ) => Effect.Effect<Array<VersionedEntityDto<TEntity>>, TCreatesError, TCreatesContext>;
    readonly findUpdates: (
      clientView: typeof ReplicacheClientViewsModel.Table.Model.Type,
      userId: ActorsContract.UserActor["id"],
    ) => Effect.Effect<Array<VersionedEntityDto<TEntity>>, TUpdatesError, TUpdatesContext>;
    readonly findDeletes: (
      clientView: typeof ReplicacheClientViewsModel.Table.Model.Type,
      userId: ActorsContract.UserActor["id"],
    ) => Effect.Effect<
      Array<Pick<VersionedEntityDto<TEntity>, "id">>,
      TDeletesError,
      TDeletesContext
    >;
    readonly fastForward: (
      clientView: typeof ReplicacheClientViewsModel.Table.Model.Type,
      excludeIds: Array<VersionedEntityDto<TEntity>["id"]>,
      userId: ActorsContract.UserActor["id"],
    ) => Effect.Effect<Array<VersionedEntityDto<TEntity>>, TFastForwardError, TFastForwardContext>;
  }

  export interface EntityStreamer<
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
    readonly streamCreates: (
      clientView: typeof ReplicacheClientViewsModel.Table.Model.Type,
      userId: ActorsContract.UserActor["id"],
    ) => Stream.Stream<
      VersionedEntityDto<TEntity>,
      TCreatesError | Exclude<TPolicyError, AccessControl.AccessDeniedError>,
      TCreatesContext | TPolicyContext
    >;
    readonly streamUpdates: (
      clientView: typeof ReplicacheClientViewsModel.Table.Model.Type,
      userId: ActorsContract.UserActor["id"],
    ) => Stream.Stream<
      VersionedEntityDto<TEntity>,
      TUpdatesError | Exclude<TPolicyError, AccessControl.AccessDeniedError>,
      TUpdatesContext | TPolicyContext
    >;
    readonly streamDeletes: (
      clientView: typeof ReplicacheClientViewsModel.Table.Model.Type,
      userId: ActorsContract.UserActor["id"],
    ) => Stream.Stream<
      VersionedEntityDto<TEntity>["id"],
      TDeletesError | Exclude<TPolicyError, AccessControl.AccessDeniedError>,
      TDeletesContext | TPolicyContext
    >;
    readonly streamFastForward: (
      clientView: typeof ReplicacheClientViewsModel.Table.Model.Type,
      excludeIds: Iterable<VersionedEntityDto<TEntity>["id"]>,
      userId: ActorsContract.UserActor["id"],
    ) => Stream.Stream<
      VersionedEntityDto<TEntity>,
      TFastForwardError | Exclude<TPolicyError, AccessControl.AccessDeniedError>,
      TFastForwardContext | TPolicyContext
    >;
  }

  export class EntityStreamerBuilder<
    TEntity extends Models.SyncTableName,
    TQuery extends EntitySource<TEntity> | null = null,
  > {
    public constructor(public readonly entity: TEntity) {}

    #queries = Iterable.empty<Omit<EntitySource<TEntity>, "entity">>();

    public readonly QueryType = {} as EntitySource<
      TEntity,
      Effect.Error<NonNullable<TQuery>["policy"]>,
      Effect.Services<NonNullable<TQuery>["policy"]>,
      Effect.Error<ReturnType<NonNullable<TQuery>["findCreates"]>>,
      Effect.Services<ReturnType<NonNullable<TQuery>["findCreates"]>>,
      Effect.Error<ReturnType<NonNullable<TQuery>["findUpdates"]>>,
      Effect.Services<ReturnType<NonNullable<TQuery>["findUpdates"]>>,
      Effect.Error<ReturnType<NonNullable<TQuery>["findDeletes"]>>,
      Effect.Services<ReturnType<NonNullable<TQuery>["findDeletes"]>>,
      Effect.Error<ReturnType<NonNullable<TQuery>["fastForward"]>>,
      Effect.Services<ReturnType<NonNullable<TQuery>["fastForward"]>>
    >;

    public source<
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
        EntitySource<
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
      this.#queries = Iterable.append(this.#queries, { policy, ...functions });

      return this as EntityStreamerBuilder<
        TEntity,
        NonNullable<
          | TQuery
          | EntitySource<
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

    public readonly build = () =>
      ({
        entity: this.entity,
        streamCreates: this.#streamCreates,
        streamUpdates: this.#streamUpdates,
        streamDeletes: this.#streamDeletes,
        streamFastForward: this.#streamFastForward,
      }) as EntityStreamer<
        TEntity,
        Effect.Error<NonNullable<TQuery>["policy"]>,
        Effect.Services<NonNullable<TQuery>["policy"]>,
        Effect.Error<ReturnType<NonNullable<TQuery>["findCreates"]>>,
        Effect.Services<ReturnType<NonNullable<TQuery>["findCreates"]>>,
        Effect.Error<ReturnType<NonNullable<TQuery>["findUpdates"]>>,
        Effect.Services<ReturnType<NonNullable<TQuery>["findUpdates"]>>,
        Effect.Error<ReturnType<NonNullable<TQuery>["findDeletes"]>>,
        Effect.Services<ReturnType<NonNullable<TQuery>["findDeletes"]>>,
        Effect.Error<ReturnType<NonNullable<TQuery>["fastForward"]>>,
        Effect.Services<ReturnType<NonNullable<TQuery>["fastForward"]>>
      >;

    // oxlint-disable-next-line class-methods-use-this
    #streamData = <TData extends VersionedEntityDto<TEntity>, TError, TServices>(
      effects: Iterable<
        Effect.Effect<Array<TData>, TError | AccessControl.AccessDeniedError, TServices>
      >,
    ) =>
      MutableHashMap.empty<TData["id"], TData>().pipe(
        SynchronizedRef.make,
        Effect.tap((ref) =>
          Effect.all(
            Iterable.map(effects, (effect) =>
              effect.pipe(
                Effect.catchTag("AccessDeniedError", () => Effect.sync(Array.empty<TData>)),
                Effect.map(
                  Array.map((data) =>
                    ref.pipe(SynchronizedRef.update(MutableHashMap.set(data.id, data))),
                  ),
                ),
                Effect.flatMap((effects) => Effect.all(effects, { discard: true })),
              ),
            ),
            { concurrency: "unbounded", discard: true },
          ),
        ),
        Effect.flatMap(SynchronizedRef.get),
        Effect.map(MutableHashMap.values),
        Stream.fromIterableEffect,
      );

    // oxlint-disable-next-line class-methods-use-this
    #streamIds = <TData extends Pick<VersionedEntityDto<TEntity>, "id">, TError, TServices>(
      effects: Iterable<
        Effect.Effect<Array<TData>, TError | AccessControl.AccessDeniedError, TServices>
      >,
    ) =>
      MutableHashSet.empty<TData["id"]>().pipe(
        SynchronizedRef.make,
        Effect.tap((ref) =>
          Effect.all(
            Iterable.map(effects, (effect) =>
              effect.pipe(
                Effect.catchTag("AccessDeniedError", () => Effect.sync(Array.empty<TData>)),
                Effect.map(
                  Array.map((data) =>
                    ref.pipe(SynchronizedRef.update(MutableHashSet.add(data.id))),
                  ),
                ),
                Effect.flatMap((effects) => Effect.all(effects, { discard: true })),
              ),
            ),
            { concurrency: "unbounded", discard: true },
          ),
        ),
        Effect.flatMap(SynchronizedRef.get),
        Stream.fromIterableEffect,
      );

    #streamCreates = (
      clientView: typeof ReplicacheClientViewsModel.Table.Model.Type,
      userId: ActorsContract.UserActor["id"],
    ) =>
      this.#streamData(
        Iterable.map(this.#queries, (q) => {
          const query = q as typeof this.QueryType;

          return query.findCreates(clientView, userId).pipe(AccessControl.enforce(query.policy));
        }),
      );

    #streamUpdates = (
      clientView: typeof ReplicacheClientViewsModel.Table.Model.Type,
      userId: ActorsContract.UserActor["id"],
    ) =>
      this.#streamData(
        Iterable.map(this.#queries, (q) => {
          const query = q as typeof this.QueryType;

          return query.findUpdates(clientView, userId).pipe(AccessControl.enforce(query.policy));
        }),
      );

    #streamDeletes = (
      clientView: typeof ReplicacheClientViewsModel.Table.Model.Type,
      userId: ActorsContract.UserActor["id"],
    ) =>
      this.#streamIds(
        Iterable.map(this.#queries, (q) => {
          const query = q as typeof this.QueryType;

          return query.findDeletes(clientView, userId).pipe(AccessControl.enforce(query.policy));
        }),
      );

    #streamFastForward = (
      clientView: typeof ReplicacheClientViewsModel.Table.Model.Type,
      excludeIds: Iterable<Models.SyncTable["Dto"]["Type"]["id"]>,
      userId: ActorsContract.UserActor["id"],
    ) =>
      this.#streamData(
        Iterable.map(this.#queries, (q) => {
          const query = q as typeof this.QueryType;

          return query
            .fastForward(clientView, Array.fromIterable(excludeIds), userId)
            .pipe(AccessControl.enforce(query.policy));
        }),
      );
  }

  export class Streamer<
    TRecord extends {
      [TEntity in Models.SyncTableName]?: EntityStreamer<TEntity>;
      // oxlint-disable-next-line typescript/no-empty-object-type
    } = {},
    TIsFinal extends boolean = false,
  > {
    #isFinal = false;
    #map = HashMap.empty<EntityStreamer["entity"], EntityStreamer<any>>();

    public entity<
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
      this: TIsFinal extends false ? Streamer<TRecord, TIsFinal> : never,
      streamer: EntityStreamer<
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
      if (!this.#isFinal) this.#map = HashMap.set(this.#map, streamer.entity, streamer);

      return this as Streamer<
        TRecord &
          Record<
            TEntity,
            EntityStreamer<
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

    public final(
      this: TRecord extends {
        [TEntity in Models.SyncTableName]: EntityStreamer<TEntity>;
      }
        ? Streamer<TRecord, TIsFinal>
        : never,
    ) {
      this.#isFinal = true;

      return this as Streamer<TRecord, true>;
    }

    public streamCreates(
      this: TRecord extends {
        [TEntity in Models.SyncTableName]: EntityStreamer<TEntity>;
      }
        ? Streamer<TRecord, TIsFinal>
        : never,
      clientView: typeof ReplicacheClientViewsModel.Table.Model.Type,
      userId: ActorsContract.UserActor["id"],
    ) {
      return this.#map.pipe(
        HashMap.entries,
        Iterable.map(([entity, streamer]) =>
          streamer.streamCreates(clientView, userId).pipe(Stream.map((data) => ({ entity, data }))),
        ),
        Stream.mergeAll({ concurrency: "unbounded" }),
      ) as Stream.Stream<
        {
          [TEntity in Models.SyncTableName]: {
            entity: TEntity;
            data: Stream.Success<ReturnType<NonNullable<TRecord[TEntity]>["streamCreates"]>>;
          };
        }[Models.SyncTableName],
        Stream.Error<ReturnType<NonNullable<TRecord[Models.SyncTableName]>["streamCreates"]>>,
        Stream.Services<ReturnType<NonNullable<TRecord[Models.SyncTableName]>["streamCreates"]>>
      >;
    }

    public streamUpdates(
      this: TRecord extends {
        [TEntity in Models.SyncTableName]: EntityStreamer<TEntity>;
      }
        ? Streamer<TRecord, TIsFinal>
        : never,
      clientView: typeof ReplicacheClientViewsModel.Table.Model.Type,
      userId: ActorsContract.UserActor["id"],
    ) {
      return this.#map.pipe(
        HashMap.entries,
        Iterable.map(([entity, streamer]) =>
          streamer.streamUpdates(clientView, userId).pipe(Stream.map((data) => ({ entity, data }))),
        ),
        Stream.mergeAll({ concurrency: "unbounded" }),
      ) as Stream.Stream<
        {
          [TEntity in Models.SyncTableName]: {
            entity: TEntity;
            data: Stream.Success<ReturnType<NonNullable<TRecord[TEntity]>["streamUpdates"]>>;
          };
        }[Models.SyncTableName],
        Stream.Error<ReturnType<NonNullable<TRecord[Models.SyncTableName]>["streamUpdates"]>>,
        Stream.Services<ReturnType<NonNullable<TRecord[Models.SyncTableName]>["streamUpdates"]>>
      >;
    }

    public streamDeletes(
      this: TRecord extends {
        [TEntity in Models.SyncTableName]: EntityStreamer<TEntity>;
      }
        ? Streamer<TRecord, TIsFinal>
        : never,
      clientView: typeof ReplicacheClientViewsModel.Table.Model.Type,
      userId: ActorsContract.UserActor["id"],
    ) {
      return this.#map.pipe(
        HashMap.entries,
        Iterable.map(([entity, streamer]) =>
          streamer.streamDeletes(clientView, userId).pipe(Stream.map((id) => ({ entity, id }))),
        ),
        Stream.mergeAll({ concurrency: "unbounded" }),
      ) as Stream.Stream<
        {
          [TEntity in Models.SyncTableName]: {
            entity: TEntity;
            id: Stream.Success<ReturnType<NonNullable<TRecord[TEntity]>["streamDeletes"]>>;
          };
        }[Models.SyncTableName],
        Stream.Error<ReturnType<NonNullable<TRecord[Models.SyncTableName]>["streamDeletes"]>>,
        Stream.Services<ReturnType<NonNullable<TRecord[Models.SyncTableName]>["streamDeletes"]>>
      >;
    }

    public streamFastForward(
      this: TRecord extends {
        [TEntity in Models.SyncTableName]: EntityStreamer<TEntity>;
      }
        ? Streamer<TRecord, TIsFinal>
        : never,
      clientView: typeof ReplicacheClientViewsModel.Table.Model.Type,
      excludes: Iterable<{
        entity: Models.SyncTableName;
        id: Models.SyncTable["Dto"]["Type"]["id"];
      }>,
      userId: ActorsContract.UserActor["id"],
    ) {
      return this.#map.pipe(
        HashMap.entries,
        Iterable.map(([entity, streamer]) =>
          streamer
            .streamFastForward(
              clientView,
              Iterable.filterMap(excludes, (exclude) =>
                exclude.entity === entity ? Result.succeed(exclude.id) : Result.failVoid,
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
            data: Stream.Success<ReturnType<NonNullable<TRecord[TEntity]>["streamFastForward"]>>;
          };
        }[Models.SyncTableName],
        Stream.Error<ReturnType<NonNullable<TRecord[Models.SyncTableName]>["streamFastForward"]>>,
        Stream.Services<ReturnType<NonNullable<TRecord[Models.SyncTableName]>["streamFastForward"]>>
      >;
    }
  }
}
