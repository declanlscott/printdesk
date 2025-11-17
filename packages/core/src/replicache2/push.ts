import * as Data from "effect/Data";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { Replicache } from ".";
import { AccessControl } from "../access-control2";
import { Auth } from "../auth2";
import { ColumnsContract } from "../columns2/contract";
import { Database } from "../database2";
import { Mutations } from "../mutations";
import { Procedures } from "../procedures";
import { ReplicacheContract } from "./contract";
import { ReplicacheClientGroupsModel, ReplicacheClientsModel } from "./models";
import { ReplicacheNotifier } from "./notifier";

export class PastMutationError extends Data.TaggedError("PastMutationError")<{
  readonly mutationId: typeof ReplicacheContract.Mutation.Type.id;
}> {}

export class FutureMutationError extends Data.TaggedError(
  "FutureMutationError",
)<{ readonly mutationId: typeof ReplicacheContract.Mutation.Type.id }> {}

/**
 * Implements the row version strategy push algorithm from the [Replicache docs](https://doc.replicache.dev/strategies/row-version#push).
 */
export class ReplicachePusher extends Effect.Service<ReplicachePusher>()(
  "@printdesk/core/replicache/ReplicachePusher",
  {
    dependencies: [
      Database.TransactionManager.Default,
      Replicache.ClientGroupsRepository.Default,
      Replicache.ClientsRepository.Default,
      Mutations.Dispatcher.Default,
      Procedures.Mutations.Default,
    ],
    effect: Effect.gen(function* () {
      const session = yield* Auth.Session;

      const db = yield* Database.TransactionManager;
      const clientGroupsRepository = yield* Replicache.ClientGroupsRepository;
      const clientsRepository = yield* Replicache.ClientsRepository;

      const dispatcher = yield* Mutations.Dispatcher.client;

      const decode = yield* Procedures.Mutations.ReplicacheSchema.pipe(
        Effect.map(Schema.encodedSchema),
        Effect.map(Schema.decodeUnknown),
      );

      const process = (
        clientGroupId: ReplicacheContract.PushRequestV1["clientGroupId"],
        mutation: ReplicacheContract.MutationV1,
        errorMode = false,
      ) =>
        decode(mutation).pipe(
          Effect.flatMap((mutation) =>
            // 2: Begin transaction
            db.withTransaction(() =>
              Effect.gen(function* () {
                const [clientGroup, client] = yield* Effect.all(
                  [
                    // 3: Get client group
                    clientGroupsRepository
                      .findByIdForUpdate(clientGroupId, session.tenantId)
                      .pipe(
                        Effect.catchTag("NoSuchElementException", () =>
                          Effect.succeed(
                            ReplicacheClientGroupsModel.Record.make({
                              id: clientGroupId,
                              ...session,
                            }),
                          ),
                        ),
                      ),

                    // 5: Get client
                    clientsRepository
                      .findByIdForUpdate(mutation.clientID, session.tenantId)
                      .pipe(
                        Effect.catchTag("NoSuchElementException", () =>
                          Effect.succeed(
                            ReplicacheClientsModel.Record.make({
                              id: mutation.clientID,
                              tenantId: session.tenantId,
                              clientGroupId,
                            }),
                          ),
                        ),
                      ),
                  ],
                  { concurrency: "unbounded" },
                );

                // 4: Verify requesting user owns specified client group
                yield* AccessControl.policy(
                  (principal) =>
                    Effect.succeed(principal.userId === clientGroup.userId),
                  "User does not own specified client group.",
                );

                // 6: Verify requesting client group owns requested client
                yield* AccessControl.policy(
                  () => Effect.succeed(clientGroupId === client.clientGroupId),
                  "Requesting client group does not own requested client.",
                );

                if (client.lastMutationId === 0 && mutation.id > 1)
                  return yield* Effect.fail(
                    new ReplicacheContract.ClientStateNotFoundError(),
                  );

                // 7: Next mutation ID
                const nextMutationId = client.lastMutationId + 1;

                // 8: Rollback and skip if mutation is from the past (already processed)
                if (mutation.id < nextMutationId)
                  return yield* Effect.fail(
                    new PastMutationError({ mutationId: mutation.id }),
                  );

                // 9: Rollback if mutation is from the future
                if (mutation.id > nextMutationId)
                  return yield* Effect.fail(
                    new FutureMutationError({ mutationId: mutation.id }),
                  );

                // 10: Perform mutation
                if (!errorMode)
                  // 10(i): Business logic
                  // 10(i)(a): version column is automatically updated by Drizzle on any affected rows
                  yield* dispatcher
                    .dispatch(
                      mutation.name,
                      { encoded: mutation.args },
                      session,
                    )
                    .pipe(
                      // 10(ii)(a,b): Log and abort
                      Effect.tapErrorCause((error) =>
                        Effect.logError(
                          `[ReplicachePusher]: Error processing mutation "${mutation.id}"`,
                          error,
                        ),
                      ),
                    );

                const nextClientVersion = ColumnsContract.Version.make(
                  clientGroup.clientVersion + 1,
                );

                yield* Effect.all(
                  [
                    // 11: Upsert client group
                    clientGroupsRepository.upsert({
                      id: clientGroup.id,
                      tenantId: clientGroup.tenantId,
                      userId: clientGroup.userId,
                      clientVersion: nextClientVersion,
                      clientViewVersion: clientGroup.clientViewVersion,
                    }),

                    // 12: Upsert client
                    clientsRepository.upsert({
                      id: client.id,
                      tenantId: client.tenantId,
                      clientGroupId,
                      lastMutationId: nextMutationId,
                      version: nextClientVersion,
                    }),
                  ],
                  { concurrency: "unbounded" },
                );
              }),
            ),
          ),
          Effect.timed,
          Effect.flatMap(([duration]) =>
            Effect.log(
              `[ReplicachePusher]: Processed mutation "${mutation.id}" in ${duration.pipe(Duration.toMillis)}ms`,
            ),
          ),
          Effect.tapErrorCause((error) =>
            Effect.log(
              `[ReplicachePusher]: Encountered error during push on mutation "${mutation.id}"`,
              error,
            ),
          ),
          Effect.catchTag("PastMutationError", (error) =>
            Effect.log(
              `[ReplicachePusher]: Mutation "${error.mutationId}" already processed - skipping`,
            ),
          ),
        );

      const push = Effect.fn("ReplicachePusher.push")(
        (pushRequest: ReplicacheContract.PushRequest) =>
          Effect.gen(function* () {
            if (pushRequest.pushVersion !== 1)
              return yield* Effect.fail(
                new ReplicacheContract.VersionNotSupportedError("push"),
              );

            yield* Effect.forEach(pushRequest.mutations, (mutation) =>
              // 1: Error mode is initially false
              process(pushRequest.clientGroupId, mutation).pipe(
                // 10(ii)(c): Retry mutation in error mode
                Effect.orElse(() =>
                  process(pushRequest.clientGroupId, mutation, true),
                ),
              ),
            ).pipe(
              Effect.provide(
                ReplicacheNotifier.Default(pushRequest.clientGroupId),
              ),
            );
          }).pipe(
            Effect.timed,
            Effect.flatMap(([duration, response]) =>
              Effect.log(
                `[ReplicachePusher]: Processed push request in ${duration.pipe(Duration.toMillis)}ms`,
              ).pipe(Effect.as(response)),
            ),
            Effect.tapErrorCause((error) =>
              Effect.log(
                "[ReplicachePusher]: Encountered error during push",
                error,
              ),
            ),
          ),
      );

      return { push } as const;
    }),
  },
) {}
