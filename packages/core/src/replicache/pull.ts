import * as Array from "effect/Array";
import * as Chunk from "effect/Chunk";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Record from "effect/Record";
import * as Tuple from "effect/Tuple";

import { Replicache } from ".";
import { AccessControl } from "../access-control";
import { Actors } from "../actors";
import { ColumnsContract } from "../columns/contract";
import { Database } from "../database";
import { Queries } from "../queries";
import { ReplicacheContract, ReplicachePullerContract } from "./contracts";
import {
  ReplicacheClientGroupsModel,
  ReplicacheClientViewsModel,
} from "./models";

import type { ReplicacheClientsModel } from "./models";

/**
 * Implements the row version strategy pull algorithm from the [Replicache docs](https://doc.replicache.dev/strategies/row-version#pull).
 */
export class ReplicachePuller extends Effect.Service<ReplicachePuller>()(
  "@printdesk/core/replicache/Puller",
  {
    accessors: true,
    dependencies: [
      Database.TransactionManager.Default,
      Replicache.ClientGroupsRepository.Default,
      Replicache.ClientsRepository.Default,
      Replicache.ClientViewsRepository.Default,
      Replicache.ClientViewEntriesRepository.Default,
      Queries.Differentiator.Default,
    ],
    effect: Effect.gen(function* () {
      const db = yield* Database.TransactionManager;
      const clientGroupsRepository = yield* Replicache.ClientGroupsRepository;
      const clientsRepository = yield* Replicache.ClientsRepository;
      const clientViewsRepository = yield* Replicache.ClientViewsRepository;
      const clientViewEntriesRepository =
        yield* Replicache.ClientViewEntriesRepository;

      const differentiator = yield* Queries.Differentiator;

      const process = (cookie: ReplicachePullerContract.RequestV1["cookie"]) =>
        Effect.all([
          Replicache.ClientGroupId,
          Actors.Actor.pipe(
            Effect.flatMap((actor) => actor.assert("UserActor")),
          ),
        ]).pipe(
          Effect.flatMap(([clientGroupId, { id: userId, tenantId }]) =>
            // 3: Begin transaction
            db
              .withTransaction(
                () =>
                  Effect.gen(function* () {
                    const [
                      previousClientView,
                      clientGroup,
                      maxClientViewVersion,
                    ] = yield* Effect.all(
                      [
                        // 1: Find previous client view
                        cookie
                          ? clientViewsRepository
                              .findById(clientGroupId, cookie.order, tenantId)
                              .pipe(
                                Effect.catchTag("NoSuchElementException", () =>
                                  Effect.fail(
                                    new ReplicacheContract.ClientStateNotFoundError(),
                                  ),
                                ),
                                Effect.map(Option.some),
                              )
                          : Effect.succeedNone,

                        // 4: Get client group
                        clientGroupsRepository
                          .findByIdForUpdate(clientGroupId, tenantId)
                          .pipe(
                            Effect.catchTag("NoSuchElementException", () =>
                              Effect.succeed(
                                new ReplicacheClientGroupsModel.Table.Record({
                                  id: clientGroupId,
                                  tenantId,
                                  userId,
                                }),
                              ),
                            ),
                          ),

                        clientViewsRepository
                          .findMaxVersionByGroupId(clientGroupId, tenantId)
                          .pipe(
                            Effect.catchTag("NoSuchElementException", () =>
                              Effect.fail(
                                new ReplicacheContract.ClientStateNotFoundError(),
                              ),
                            ),
                          ),
                      ],
                      { concurrency: "unbounded" },
                    );

                    // 2: Initialize client view
                    const clientView = previousClientView.pipe(
                      Option.getOrElse(
                        () =>
                          new ReplicacheClientViewsModel.Table.Record({
                            clientGroupId,
                            tenantId,
                          }),
                      ),
                    );

                    // 5: Verify requesting client group owns requested client
                    yield* AccessControl.userPolicy(
                      {
                        name: ReplicacheClientGroupsModel.Table.name,
                        id: clientGroupId,
                      },
                      (user) => Effect.succeed(user.id === clientGroup.userId),
                    );

                    // 13: Increment client view version
                    const nextClientViewVersion = ColumnsContract.Version.make(
                      Math.max(
                        cookie?.order ?? 0,
                        clientGroup.clientViewVersion ?? 0,
                      ) + 1,
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

                    const { diff, clients } = yield* Effect.all(
                      {
                        // 6, 8, 9, 11: Compute patch and client view entries
                        diff: differentiator.differentiate(
                          clientView,
                          userId,
                          upserts.length,
                          {
                            next: nextClientViewVersion,
                            max: maxClientViewVersion,
                          },
                        ),

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
                    if (
                      previousClientView.pipe(Option.isSome) &&
                      diff.patch.pipe(Chunk.isEmpty)
                    )
                      return Option.none();

                    const [, nextClientView] = yield* Effect.all(
                      Tuple.appendElement(
                        // 14, 16: Write client group and client view
                        upserts,

                        // 17: Write client view entries
                        diff.clientViewEntries.pipe(Chunk.isNonEmpty)
                          ? diff.clientViewEntries.pipe(
                              Chunk.toArray,
                              clientViewEntriesRepository.upsertMany,
                            )
                          : Effect.void,
                      ),
                      { concurrency: "unbounded" },
                    );

                    // 15: Commit transaction
                    return Option.some({
                      patch: diff.patch,
                      clients,
                      clientView: {
                        previous: previousClientView,
                        next: nextClientView,
                      },
                    });
                  }),
                { retry: true },
              )
              .pipe(
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
                            result.patch.pipe(
                              Chunk.prepend(
                                new ReplicachePullerContract.ClearOperation(),
                              ),
                            ),
                          onSome: () => result.patch,
                        }),
                      );

                      // 18(ii): Construct cookie
                      const cookie = {
                        order: result.clientView.next.version,
                      };

                      // 18(iii): Last mutation ID changes
                      const lastMutationIdChanges = Array.reduce(
                        result.clients,
                        Record.empty<
                          (typeof ReplicacheClientsModel.Table.Record.Type)["id"],
                          (typeof ReplicacheClientsModel.Table.Record.Type)["version"]
                        >(),
                        (changes, client) =>
                          Record.set(changes, client.id, client.version),
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
          ),
        );

      const pull = Effect.fn("ReplicachePuller.pull")(
        (request: ReplicachePullerContract.Request) =>
          Effect.succeed(request).pipe(
            Effect.filterOrFail(
              ReplicachePullerContract.isRequestV1,
              () => new ReplicacheContract.VersionNotSupportedError("pull"),
            ),
            Effect.flatMap((requestV1) =>
              process(requestV1.cookie).pipe(
                Effect.catchTag("DifferenceLimitExceededError", () =>
                  Effect.log(
                    "[ReplicachePuller]: Difference limit exceeded, trying again with client view reset ...",
                  ).pipe(Effect.flatMap(() => process(null))),
                ),
                Effect.provideService(
                  Replicache.ClientGroupId,
                  requestV1.clientGroupId,
                ),
              ),
            ),
            Effect.timed,
            Effect.flatMap(([duration, response]) =>
              Effect.log(
                `[ReplicachePuller]: Processed pull request in ${duration.pipe(Duration.toMillis)}ms`,
              ).pipe(Effect.as(response)),
            ),
            Effect.tapErrorCause((error) =>
              Effect.log(
                "[ReplicachePuller]: Encountered error during pull",
                error,
              ),
            ),
          ),
      );

      return { pull } as const;
    }),
  },
) {}
