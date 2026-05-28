import * as Array from "effect/Array";
import * as Chunk from "effect/Chunk";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Record from "effect/Record";
import * as Struct from "effect/Struct";
import * as Tuple from "effect/Tuple";

import { ReplicachePuller } from ".";
import { AccessControl } from "../../access-control";
import { Actor } from "../../actors";
import { Database } from "../../database";
import { Syncer } from "../../sync/syncer";
import { Version } from "../../utils";
import { ReplicacheClientGroupId } from "../client-group-id";
import { ReplicacheContract, ReplicachePullerContract } from "../contracts";
import {
  ReplicacheClientGroupsModel,
  ReplicacheClientsModel,
  ReplicacheClientViewsModel,
} from "../models";
import { ReplicacheClientGroupsRepository } from "../repositories/client-groups";
import { ReplicacheClientViewEntriesRepository } from "../repositories/client-view-entries";
import { ReplicacheClientViewsRepository } from "../repositories/client-views";
import { ReplicacheClientsRepository } from "../repositories/clients";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const clientGroupsRepository = yield* ReplicacheClientGroupsRepository;
  const clientsRepository = yield* ReplicacheClientsRepository;
  const clientViewsRepository = yield* ReplicacheClientViewsRepository;
  const clientViewEntriesRepository = yield* ReplicacheClientViewEntriesRepository;

  const { sync } = yield* Syncer;

  const process = Effect.fn("ReplicachePuller.process")(
    function* (cookie: ReplicachePullerContract.RequestV1["cookie"]) {
      const clientGroupId = yield* ReplicacheClientGroupId;
      const { id: userId, tenantId } = yield* Actor.pipe(Effect.flatMap(Struct.get("assertUser")));

      // 1: Find previous client view
      const previousClientViewEffect = cookie
        ? clientViewsRepository.findById(clientGroupId, cookie.order, tenantId).pipe(
            Effect.catchTag(
              "NoSuchElementError",
              () => new ReplicacheContract.ClientStateNotFoundError(),
            ),
            Effect.map(Option.some),
          )
        : Effect.succeedNone;

      // 4: Get client group
      const clientGroupEffect = clientGroupsRepository
        .findByIdForUpdate(clientGroupId, tenantId)
        .pipe(
          Effect.catchTag("NoSuchElementError", () =>
            Effect.succeed(
              ReplicacheClientGroupsModel.Table.Model.make({
                id: clientGroupId,
                tenantId,
                userId,
              }),
            ),
          ),
        );

      const maxClientViewVersionEffect = clientViewsRepository
        .findMaxVersionByGroupId(clientGroupId, tenantId)
        .pipe(
          Effect.catchTag(
            "NoSuchElementError",
            () => new ReplicacheContract.ClientStateNotFoundError(),
          ),
        );

      // 3: Begin transaction
      return yield* db.withTransaction(
        Effect.fn(function* () {
          const [previousClientView, clientGroup, maxClientViewVersion] = yield* Effect.all(
            [previousClientViewEffect, clientGroupEffect, maxClientViewVersionEffect],
            { concurrency: "unbounded" },
          );

          // 2: Initialize client view
          const clientView = previousClientView.pipe(
            Option.getOrElse(() =>
              ReplicacheClientViewsModel.Table.Model.make({ clientGroupId, tenantId }),
            ),
          );

          // 5: Verify requesting client group owns requested client
          yield* AccessControl.userPolicy(
            { name: ReplicacheClientGroupsModel.Table.name, id: clientGroupId },
            (user) => Effect.succeed(user.id === clientGroup.userId),
          );

          // 13: Increment client view version
          const nextClientViewVersion = Version.make(
            Math.max(cookie?.order ?? 0, clientGroup.clientViewVersion ?? 0) + 1,
          );

          const upserts = Tuple.make(
            clientGroupsRepository.upsert({
              id: clientGroupId,
              tenantId,
              userId,
              clientVersion: clientGroup.clientVersion,
              clientViewVersion: nextClientViewVersion,
            }),
            clientViewsRepository.upsert({
              clientGroupId,
              clientVersion: clientGroup.clientVersion,
              version: nextClientViewVersion,
              tenantId,
            }),
          );

          const { result, clients } = yield* Effect.all(
            {
              // 6, 8, 9, 11: Compute patch and client view entries
              result: sync(clientView, userId, upserts.length, {
                next: nextClientViewVersion,
                max: maxClientViewVersion,
              }),

              // 7, 12: Find clients that have changed since the client view
              clients: clientsRepository.findSinceVersionByGroupId(
                clientView.clientVersion,
                clientGroupId,
                tenantId,
              ),
            },
            { concurrency: "unbounded" },
          );

          // 10: If diff is empty, return no-op
          if (previousClientView.pipe(Option.isSome) && result.patch.pipe(Chunk.isEmpty))
            return Option.none();

          const [, nextClientView] = yield* Effect.all(
            Tuple.appendElement(
              // 14, 16: Write client group and client view
              upserts,

              // 17: Write client view entries
              result.clientViewEntries.pipe(Chunk.isNonEmpty)
                ? result.clientViewEntries.pipe(
                    Chunk.toArray,
                    clientViewEntriesRepository.upsertMany,
                  )
                : Effect.void,
            ),
            { concurrency: "unbounded" },
          );

          // 15: Commit transaction
          return Option.some({
            patch: result.patch,
            clients,
            clientView: { previous: previousClientView, next: nextClientView },
          });
        }),
        { retry: true },
      );
    },
    (effect, cookie) =>
      effect.pipe(
        Effect.map(
          Option.match({
            // 10: If diff is empty, return no-op
            onNone: () =>
              ReplicachePullerContract.ResponseOkV1.make({
                cookie,
                lastMutationIdChanges: Record.empty(),
                patch: Chunk.empty(),
              }),
            onSome: (result) => {
              // 18(i): Build patch
              const patch = result.clientView.previous.pipe(
                Option.match({
                  onNone: () =>
                    result.patch.pipe(Chunk.prepend(new ReplicachePullerContract.ClearOperation())),
                  onSome: () => result.patch,
                }),
              );

              // 18(ii): Construct cookie
              const cookie = { order: result.clientView.next.version };

              // 18(iii): Last mutation ID changes
              const lastMutationIdChanges = Array.reduce(
                result.clients,
                Record.empty<
                  typeof ReplicacheClientsModel.Table.Model.Type.id,
                  typeof ReplicacheClientsModel.Table.Model.Type.version
                >(),
                (changes, client) => Record.set(changes, client.id, client.version),
              );

              return ReplicachePullerContract.ResponseOkV1.make({
                cookie,
                lastMutationIdChanges,
                patch,
              });
            },
          }),
        ),
      ),
  );

  const pull = Effect.fn("ReplicachePuller.pull")((request: ReplicachePullerContract.Request) =>
    Effect.succeed(request).pipe(
      Effect.filterOrFail(ReplicachePullerContract.isRequestV1, () =>
        ReplicacheContract.VersionNotSupportedError.new("pull"),
      ),
      Effect.flatMap((requestV1) =>
        process(requestV1.cookie).pipe(
          Effect.catchTag("SyncLimitExceededError", () =>
            Effect.log(
              "[ReplicachePuller]: Sync limit exceeded, retrying with client view reset ...",
            ).pipe(Effect.andThen(process(null))),
          ),
          Effect.catchTag("SyncLimitExceededError", Effect.die),
          Effect.provideService(ReplicacheClientGroupId, requestV1.clientGroupId),
        ),
      ),
      Effect.timed,
      Effect.flatMap(([duration, response]) =>
        Effect.log(
          `[ReplicachePuller]: Processed pull request in ${duration.pipe(Duration.toMillis)}ms`,
        ).pipe(Effect.as(response)),
      ),
      Effect.tapCause((cause) =>
        Effect.log("[ReplicachePuller]: Encountered error during pull", cause),
      ),
    ),
  );

  return { pull } as const;
});

/**
 * Implements the row version strategy pull algorithm from the [Replicache docs](https://doc.replicache.dev/strategies/row-version#pull).
 */
export const layer = makeService.pipe(Layer.effect(ReplicachePuller));
