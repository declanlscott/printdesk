import * as Array from "effect/Array";
import * as Chunk from "effect/Chunk";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";
import * as Tuple from "effect/Tuple";

import { Replicache } from ".";
import { AccessControl } from "../access-control2";
import { Auth } from "../auth2";
import { ColumnsContract } from "../columns2/contract";
import { Database } from "../database2";
import { Models } from "../models2";
import { Queries } from "../queries";
import { ReplicacheContract } from "./contract";
import {
  ReplicacheClientGroupsModel,
  ReplicacheClientViewsModel,
} from "./models";

import type { ReplicacheClientsModel } from "./models";

/**
 * Implements the row version strategy pull algorithm from the [Replicache docs](https://doc.replicache.dev/strategies/row-version#pull).
 */
export class ReplicachePuller extends Effect.Service<ReplicachePuller>()(
  "@printdesk/core/replicache/ReplicachePuller",
  {
    dependencies: [
      Database.TransactionManager.Default,
      Replicache.ClientGroupsRepository.Default,
      Replicache.ClientsRepository.Default,
      Replicache.ClientViewsRepository.Default,
      Replicache.ClientViewEntriesRepository.Default,
      Queries.Differentiator.Default,
      Models.SyncTables.Default,
    ],
    effect: Effect.gen(function* () {
      const { userId, tenantId } = yield* Auth.Session;

      const db = yield* Database.TransactionManager;
      const clientGroupsRepository = yield* Replicache.ClientGroupsRepository;
      const clientsRepository = yield* Replicache.ClientsRepository;
      const clientViewsRepository = yield* Replicache.ClientViewsRepository;
      const clientViewEntriesRepository =
        yield* Replicache.ClientViewEntriesRepository;

      const differentiator = yield* Queries.Differentiator;

      const ResponseOk = yield* ReplicacheContract.PullResponseOkV1;
      const Response = yield* ReplicacheContract.PullResponseV1;

      const pull = Effect.fn("ReplicachePuller.pull")(
        (pullRequest: ReplicacheContract.PullRequest) =>
          Effect.gen(function* () {
            if (pullRequest.pullVersion !== 1)
              return yield* Effect.fail(
                new ReplicacheContract.VersionNotSupportedError({
                  response: ReplicacheContract.VersionNotSupportedResponse.make(
                    { versionType: "pull" },
                  ),
                }),
              );

            const clientGroupId = pullRequest.clientGroupId;

            return yield* db
              // 3: Begin transaction
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
                        pullRequest.cookie
                          ? clientViewsRepository
                              .findById(
                                clientGroupId,
                                pullRequest.cookie.order,
                                tenantId,
                              )
                              .pipe(
                                Effect.catchTag("NoSuchElementException", () =>
                                  Effect.fail(
                                    new ReplicacheContract.ClientStateNotFoundError(
                                      {
                                        response:
                                          ReplicacheContract.ClientStateNotFoundResponse.make(),
                                      },
                                    ),
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
                                ReplicacheClientGroupsModel.Record.make({
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
                                new ReplicacheContract.ClientStateNotFoundError(
                                  {
                                    response:
                                      ReplicacheContract.ClientStateNotFoundResponse.make(),
                                  },
                                ),
                              ),
                            ),
                          ),
                      ],
                      { concurrency: "unbounded" },
                    );

                    // 2: Initialize client view
                    const clientView = previousClientView.pipe(
                      Option.getOrElse(() =>
                        ReplicacheClientViewsModel.Record.make({
                          clientGroupId,
                          tenantId,
                        }),
                      ),
                    );

                    // 5: Verify requesting client group owns requested client
                    yield* Effect.succeed(clientGroup).pipe(
                      AccessControl.enforce(
                        AccessControl.policy(
                          (principal) =>
                            Effect.succeed(
                              principal.userId === clientGroup.userId,
                            ),
                          "Requesting client group does not own requested client.",
                        ),
                      ),
                    );

                    // 13: Increment client view version
                    const nextClientViewVersion = ColumnsContract.Version.make(
                      Math.max(
                        pullRequest.cookie?.order ?? 0,
                        clientGroup.clientViewVersion ?? 0,
                      ) + 1,
                    );

                    const baseWrites = Tuple.make(
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
                          baseWrites.length,
                          {
                            next: nextClientViewVersion,
                            max: maxClientViewVersion,
                          },
                        ),

                        // 7, 12: Find clients that have changed since the base client view
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
                        baseWrites,

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
                      ResponseOk.make({
                        cookie: pullRequest.cookie,
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
                                ReplicacheContract.ClearOperation.make(),
                              ),
                            ),
                          onSome: () => result.patch,
                        }),
                      );

                      // 18(ii): Construct cookie
                      const cookie = { order: result.clientView.next.version };

                      // 18(iii): Last mutation ID changes
                      const lastMutationIdChanges = Array.reduce(
                        result.clients,
                        Record.empty<
                          ReplicacheClientsModel.Record["id"],
                          ReplicacheClientsModel.Record["version"]
                        >(),
                        (changes, client) =>
                          Record.set(changes, client.id, client.version),
                      );

                      return ResponseOk.make({
                        cookie,
                        lastMutationIdChanges,
                        patch,
                      });
                    },
                  }),
                ),
              );
          }).pipe(
            Effect.catchTags({
              VersionNotSupportedError: (error) =>
                Effect.succeed(error.response),
              ClientStateNotFoundError: (error) =>
                Effect.succeed(error.response),
            }),
            Effect.flatMap(Schema.encode(Response)),
            Effect.timed,
            Effect.flatMap(([duration, result]) =>
              Effect.log(
                `Processed pull in ${duration.pipe(Duration.toMillis)}ms`,
              ).pipe(Effect.as(result)),
            ),
            Effect.tapErrorCause((error) =>
              Effect.log("Encountered error during pull", error),
            ),
          ),
      );

      return { pull } as const;
    }),
  },
) {}
