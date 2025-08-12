import { Data, DateTime, Effect, Schema } from "effect";

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
  readonly id: typeof ReplicacheContract.Mutation.Type.id;
}> {}

export class FutureMutationError extends Data.TaggedError(
  "FutureMutationError",
)<{ readonly id: typeof ReplicacheContract.Mutation.Type.id }> {}

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

      const Mutation = yield* Mutations.ReplicacheSchema;
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

            const clientGroupId = pushRequest.clientGroupID;

            const processMutation = (
              mutation: typeof ReplicacheContract.MutationV1.Type,
            ) =>
              Effect.succeed(Mutation).pipe(
                Effect.map(Schema.encodedSchema),
                Effect.map(Schema.decodeUnknown),
                Effect.flatMap((decode) => decode(mutation)),
                Effect.flatMap((mutation) =>
                  // 2: Begin transaction
                  db.withTransaction(() =>
                    Effect.gen(function* () {
                      // 3: Get client group
                      const clientGroup = yield* clientGroupsRepository
                        .findById(clientGroupId, tenantId)
                        .pipe(
                          Effect.catchTag("NoSuchElementException", () =>
                            DateTime.now.pipe(
                              Effect.map((now) =>
                                ReplicacheClientGroupsContract.table.Schema.make(
                                  {
                                    id: clientGroupId,
                                    tenantId,
                                    userId,
                                    clientViewVersion: 0,
                                    createdAt: now,
                                    updatedAt: now,
                                    deletedAt: null,
                                  },
                                ),
                              ),
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

                      // 5: Get client
                      const client = yield* clientsRepository
                        .findById(mutation.clientID, tenantId)
                        .pipe(
                          Effect.catchTag("NoSuchElementException", () =>
                            DateTime.now.pipe(
                              Effect.map((now) =>
                                ReplicacheClientsContract.table.Schema.make({
                                  id: mutation.clientID,
                                  tenantId,
                                  clientGroupId,
                                  lastMutationId: 0,
                                  version: 0,
                                  createdAt: now,
                                  updatedAt: now,
                                  deletedAt: null,
                                }),
                              ),
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
                          new PastMutationError({ id: mutation.id }),
                        );

                      // 9: Rollback if mutation is from the future
                      if (mutation.id > nextMutationId)
                        return yield* Effect.fail(
                          new FutureMutationError({ id: mutation.id }),
                        );

                      // 10: Perform mutation
                      yield* dispatcher.dispatch(mutation.name, {
                        encoded: mutation.args,
                      });
                    }),
                  ),
                ),
              );
          }),
      );

      return { push } as const;
    }),
  },
) {}
