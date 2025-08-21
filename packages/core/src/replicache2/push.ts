import { Data, DateTime, Duration, Effect, Schema } from "effect";

import { Replicache } from ".";
import { AccessControl } from "../access-control2";
import { Auth } from "../auth2";
import { DataAccess } from "../data-access2";
import { Mutations } from "../data-access2/functions";
import { Database } from "../database2";
import {
  ReplicacheClientGroupsContract,
  ReplicacheClientsContract,
  ReplicacheContract,
} from "./contracts";

export class PastMutationError extends Data.TaggedError("PastMutationError")<{
  readonly mutationId: typeof ReplicacheContract.Mutation.Type.id;
}> {}

export class FutureMutationError extends Data.TaggedError(
  "FutureMutationError",
)<{ readonly mutationId: typeof ReplicacheContract.Mutation.Type.id }> {}

export class ReplicachePusher extends Effect.Service<ReplicachePusher>()(
  "@printdesk/core/replicache/ReplicachePusher",
  {
    dependencies: [
      Database.TransactionManager.Default,
      Replicache.ClientGroupsRepository.Default,
      Replicache.ClientsRepository.Default,
      Mutations.Default,
      DataAccess.ServerMutations.Default,
    ],
    effect: Effect.gen(function* () {
      const { userId, tenantId } = yield* Auth.Session;

      const db = yield* Database.TransactionManager;
      const clientGroupsRepository = yield* Replicache.ClientGroupsRepository;
      const clientsRepository = yield* Replicache.ClientsRepository;

      const mutations = yield* Mutations;
      const dispatcher = yield* DataAccess.ServerMutations.dispatcher;

      const push = Effect.fn("ReplicachePusher.push")(
        (pushRequest: typeof ReplicacheContract.PushRequest.Type) =>
          Effect.gen(function* () {
            if (pushRequest.pushVersion !== 1)
              return yield* Effect.fail(
                new ReplicacheContract.VersionNotSupportedError({
                  response: {
                    error: "VersionNotSupported",
                    versionType: "push",
                  },
                }),
              );

            yield* Effect.forEach(pushRequest.mutations, (mutation) =>
              // 1: Error mode is initially false
              processMutation(mutation).pipe(
                // 10(ii)(c): Retry mutation in error mode
                Effect.orElse(() => processMutation(mutation, true)),
              ),
            );

            const clientGroupId = pushRequest.clientGroupID;

            const processMutation = (
              mutation: ReplicacheContract.MutationV1,
              errorMode = false,
            ) =>
              mutations.Replicache.pipe(
                Effect.map(Schema.encodedSchema),
                Effect.map(Schema.decodeUnknown),
                Effect.flatMap((decode) => decode(mutation)),
                Effect.flatMap((mutation) =>
                  // 2: Begin transaction
                  db.withTransaction(() =>
                    Effect.gen(function* () {
                      const [clientGroup, client] = yield* DateTime.now.pipe(
                        Effect.flatMap((now) =>
                          Effect.all(
                            [
                              // 3: Get client group
                              clientGroupsRepository
                                .findByIdForUpdate(clientGroupId, tenantId)
                                .pipe(
                                  Effect.catchTag(
                                    "NoSuchElementException",
                                    () =>
                                      Effect.succeed(
                                        ReplicacheClientGroupsContract.table.Schema.make(
                                          {
                                            id: clientGroupId,
                                            tenantId,
                                            userId,
                                            clientVersion: 0,
                                            clientViewVersion: null,
                                            createdAt: now,
                                            updatedAt: now,
                                            deletedAt: null,
                                          },
                                        ),
                                      ),
                                  ),
                                ),
                              // 5: Get client
                              clientsRepository
                                .findByIdForUpdate(mutation.clientID, tenantId)
                                .pipe(
                                  Effect.catchTag(
                                    "NoSuchElementException",
                                    () =>
                                      Effect.succeed(
                                        ReplicacheClientsContract.table.Schema.make(
                                          {
                                            id: mutation.clientID,
                                            tenantId,
                                            clientGroupId,
                                            lastMutationId: 0,
                                            version: 0,
                                            createdAt: now,
                                            updatedAt: now,
                                            deletedAt: null,
                                          },
                                        ),
                                      ),
                                  ),
                                ),
                            ],
                            { concurrency: "unbounded" },
                          ),
                        ),
                      );

                      // 4: Verify requesting client group owns requested client
                      yield* Effect.succeed(clientGroup).pipe(
                        AccessControl.enforce(
                          AccessControl.policy(
                            (principal) =>
                              Effect.succeed(
                                principal.userId === clientGroup.userId,
                              ),
                            "user does not own the requested client group",
                          ),
                        ),
                      );

                      // 6: Verify requesting client group owns the client
                      yield* Effect.succeed(client).pipe(
                        AccessControl.enforce(
                          AccessControl.policy(
                            () =>
                              Effect.succeed(
                                client.clientGroupId === clientGroupId,
                              ),
                            "client group does not own the requested client",
                          ),
                        ),
                      );

                      if (client.lastMutationId === 0 && mutation.id > 1)
                        return yield* Effect.fail(
                          new ReplicacheContract.ClientStateNotFoundError({
                            response: { error: "ClientStateNotFound" },
                          }),
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
                          .dispatch(mutation.name, {
                            encoded: mutation.args,
                          })
                          .pipe(
                            // 10(ii)(a,b): Log and abort
                            Effect.tapErrorCause((error) =>
                              Effect.logError(
                                `Error processing mutation "${mutation.id}"`,
                                error,
                              ),
                            ),
                          );

                      const nextClientVersion = clientGroup.clientVersion + 1;

                      yield* Effect.all(
                        [
                          // 11: Upsert client group
                          clientGroupsRepository.upsert({
                            ...clientGroup,
                            clientVersion: nextClientVersion,
                          }),
                          // 12: Upsert client
                          clientsRepository.upsert({
                            ...client,
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
                    `Processed mutation "${mutation.id}" in ${duration.pipe(Duration.toMillis)}ms`,
                  ),
                ),
                Effect.catchTag("PastMutationError", (error) =>
                  Effect.log(
                    `Mutation "${error.mutationId}" already processed - skipping`,
                  ),
                ),
                Effect.tapErrorCause((error) =>
                  Effect.log(
                    `Encountered error during push on mutation "${mutation.id}"`,
                    error,
                  ),
                ),
              );

            return null;
          }),
      );

      return { push } as const;
    }),
  },
) {}
