import * as Data from "effect/Data";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";

import { Replicache } from ".";
import { AccessControl } from "../access-control";
import { Actors } from "../actors";
import { ColumnsContract } from "../columns/contract";
import { Database } from "../database";
import { Mutations } from "../mutations";
import { Procedures } from "../procedures";
import { ReplicacheContract, ReplicachePusherContract } from "./contracts";
import { ReplicacheClientGroupsModel, ReplicacheClientsModel } from "./models";

interface PreprocessArgs {
  readonly clientId: (typeof ReplicacheClientsModel.Table.Record.Type)["id"];
  readonly mutationId: ReplicachePusherContract.Mutation["id"];
}

interface PostprocessArgs {
  readonly clientGroup: typeof ReplicacheClientGroupsModel.Table.Record.Type;
  readonly client: typeof ReplicacheClientsModel.Table.Record.Type;
  readonly mutationId: ReplicachePusherContract.Mutation["id"];
}

export class PastMutationError extends Data.TaggedError("PastMutationError")<{
  readonly mutationId: ReplicachePusherContract.Mutation["id"];
}> {
  log() {
    return Effect.log(
      `[ReplicachePusher]: Mutation "${this.mutationId}" already processed - skipping`,
    );
  }
}

/**
 * Implements the row version strategy push algorithm from the [Replicache docs](https://doc.replicache.dev/strategies/row-version#push).
 */
export class ReplicachePusher extends Effect.Service<ReplicachePusher>()(
  "@printdesk/core/replicache/ReplicachePusher",
  {
    accessors: true,
    dependencies: [
      Database.TransactionManager.Default,
      Replicache.ClientGroupsRepository.Default,
      Replicache.ClientsRepository.Default,
      Mutations.Dispatcher.Default,
      Procedures.Mutations.Default,
    ],
    effect: Effect.gen(function* () {
      const db = yield* Database.TransactionManager;
      const clientGroupsRepository = yield* Replicache.ClientGroupsRepository;
      const clientsRepository = yield* Replicache.ClientsRepository;

      const dispatcher = yield* Mutations.Dispatcher.client;

      const preprocess = ({ clientId, mutationId }: PreprocessArgs) =>
        Effect.gen(function* () {
          const clientGroupId = yield* Replicache.ClientGroupId;
          const user = yield* Actors.Actor.pipe(
            Effect.flatMap((actor) => actor.assert("UserActor")),
          );

          const [clientGroup, client] = yield* Effect.all(
            [
              // 3: Get client group
              clientGroupsRepository
                .findByIdForUpdate(clientGroupId, user.tenantId)
                .pipe(
                  Effect.catchTag("NoSuchElementException", () =>
                    Effect.succeed(
                      new ReplicacheClientGroupsModel.Table.Record({
                        id: clientGroupId,
                        userId: user.id,
                        tenantId: user.tenantId,
                      }),
                    ),
                  ),
                ),

              // 5: Get client
              clientsRepository.findByIdForUpdate(clientId, user.tenantId).pipe(
                Effect.catchTag("NoSuchElementException", () =>
                  Effect.succeed(
                    new ReplicacheClientsModel.Table.Record({
                      id: clientId,
                      tenantId: user.tenantId,
                      clientGroupId,
                    }),
                  ),
                ),
              ),
            ],
            { concurrency: "unbounded" },
          );

          // 4: Verify requesting user owns specified client group
          yield* AccessControl.userPolicy(
            {
              name: ReplicacheClientGroupsModel.Table.name,
              id: clientGroupId,
            },
            (user) => Effect.succeed(user.id === clientGroup.userId),
          );

          // 6: Verify requesting client group owns requested client
          yield* Effect.succeed(client.clientGroupId === clientGroup.id).pipe(
            AccessControl.policy({
              name: ReplicacheClientsModel.Table.name,
              id: client.id,
            }),
          );

          if (client.lastMutationId === 0 && mutationId > 1)
            return yield* new ReplicacheContract.ClientStateNotFoundError();

          // 7: Next mutation ID
          const nextMutationId = client.lastMutationId + 1;

          // 8: Rollback and skip if mutation is from the past (already processed)
          if (mutationId < nextMutationId)
            return yield* new PastMutationError({
              mutationId,
            });

          // 9: Rollback if mutation is from the future
          if (mutationId > nextMutationId)
            return yield* new ReplicachePusherContract.FutureMutationError({
              mutationId,
            });

          return {
            clientGroup,
            client,
            mutationId,
          } satisfies PostprocessArgs;
        }).pipe(
          Effect.tapErrorCause((cause) =>
            Effect.log(
              `[ReplicachePusher]: Encountered error preprocessing mutation "${mutationId}"`,
              cause,
            ),
          ),
        );

      const mutate = (mutation: ReplicachePusherContract.Mutation) =>
        dispatcher.dispatch(mutation.name, mutation.args).pipe(
          // 10(ii)(a,b): Log and abort
          Effect.tapErrorCause((cause) =>
            Effect.logError(
              `[ReplicachePusher]: Encountered error performing mutation "${mutation.id}"`,
              cause,
            ),
          ),
        );

      const postprocess = ({
        clientGroup,
        client,
        mutationId,
      }: PostprocessArgs) =>
        Effect.gen(function* () {
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
                clientGroupId: clientGroup.id,
                lastMutationId: mutationId,
                version: nextClientVersion,
              }),
            ],
            { concurrency: "unbounded" },
          );
        }).pipe(
          Effect.tapErrorCause((cause) =>
            Effect.log(
              `[ReplicachePusher]: Encountered error postprocessing mutation "${mutationId}"`,
              cause,
            ),
          ),
        );

      const push = Effect.fn("ReplicachePusher.push")(
        (request: ReplicachePusherContract.Request) =>
          Effect.succeed(request).pipe(
            Effect.filterOrFail(
              ReplicachePusherContract.isRequestV1,
              () => new ReplicacheContract.VersionNotSupportedError("push"),
            ),
            Effect.flatMap((requestV1) =>
              Effect.forEach(requestV1.mutations, (mutationV1) =>
                Effect.gen(function* () {
                  const preprocessArgs = {
                    clientId: mutationV1.clientId,
                    mutationId: mutationV1.id,
                  } satisfies PreprocessArgs;

                  // 1, 2: Begin transaction
                  yield* db
                    .withTransaction(() =>
                      Effect.gen(function* () {
                        const postprocessArgs =
                          yield* preprocess(preprocessArgs);

                        yield* mutate(mutationV1);

                        yield* postprocess(postprocessArgs);
                      }),
                    )
                    .pipe(
                      Effect.catchTag("PastMutationError", (e) => e.log()),
                      Effect.catchAll((error) =>
                        Effect.log(
                          `[ReplicachePusher]: Mutation "${mutationV1.id}" failed with error:`,
                          error,
                          "[ReplicachePusher]: Retrying transaction again in error mode ...",
                        ).pipe(
                          Effect.flatMap(() =>
                            // 10(ii)(c): Retry transaction again without actually performing the mutation
                            db.withTransaction(() =>
                              preprocess(preprocessArgs).pipe(
                                Effect.flatMap(postprocess),
                              ),
                            ),
                          ),
                          Effect.catchTag("PastMutationError", (e) => e.log()),
                        ),
                      ),
                    );
                }),
              ).pipe(
                Effect.provideService(
                  Replicache.ClientGroupId,
                  requestV1.clientGroupId,
                ),
              ),
            ),
            Effect.as(undefined),
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
