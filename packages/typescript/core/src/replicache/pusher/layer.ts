import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Struct from "effect/Struct";

import { PastMutationError, ReplicachePusher } from ".";
import { AccessControl } from "../../access-control";
import { Actor } from "../../actors";
import { Database } from "../../database";
import { MutationDispatcher } from "../../mutations/dispatcher";
import { Version } from "../../utils";
import { ReplicacheClientGroupId } from "../client-group-id";
import { ReplicacheContract, ReplicachePusherContract } from "../contracts";
import { ReplicacheClientGroupsModel, ReplicacheClientsModel } from "../models";
import { ReplicacheClientGroupsRepository } from "../repositories/client-groups";
import { ReplicacheClientsRepository } from "../repositories/clients";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const clientGroupsRepository = yield* ReplicacheClientGroupsRepository;
  const clientsRepository = yield* ReplicacheClientsRepository;

  const dispatcher = yield* MutationDispatcher;

  const preprocess = Effect.fn("ReplicachePusher.preprocess")(
    function* (args: {
      clientId: typeof ReplicacheClientsModel.Table.Model.Type.id;
      mutationId: ReplicachePusherContract.Mutation["id"];
    }) {
      const clientGroupId = yield* ReplicacheClientGroupId;
      const user = yield* Actor.pipe(Effect.flatMap(Struct.get("assertUser")));

      // 3: Get client group
      const clientGroupEffect = clientGroupsRepository
        .findByIdForUpdate(clientGroupId, user.tenantId)
        .pipe(
          Effect.catchTag("NoSuchElementError", () =>
            Effect.succeed(
              ReplicacheClientGroupsModel.Table.Model.make({
                id: clientGroupId,
                userId: user.id,
                tenantId: user.tenantId,
              }),
            ),
          ),
        );

      // 5: Get client
      const clientEffect = clientsRepository.findByIdForUpdate(args.clientId, user.tenantId).pipe(
        Effect.catchTag("NoSuchElementError", () =>
          Effect.succeed(
            ReplicacheClientsModel.Table.Model.make({
              id: args.clientId,
              tenantId: user.tenantId,
              clientGroupId,
            }),
          ),
        ),
      );

      const [clientGroup, client] = yield* Effect.all([clientGroupEffect, clientEffect], {
        concurrency: "unbounded",
      });

      // 4: Verify requesting user owns specified client group
      yield* AccessControl.userPolicy(
        { name: ReplicacheClientGroupsModel.Table.name, id: clientGroupId },
        (user) => Effect.succeed(user.id === clientGroup.userId),
      );

      // 6: Verify requesting client group owns requested client
      yield* Effect.succeed(client.clientGroupId === clientGroup.id).pipe(
        AccessControl.policy({ name: ReplicacheClientsModel.Table.name, id: client.id }),
      );

      if (client.lastMutationId === 0 && args.mutationId > 1)
        return yield* new ReplicacheContract.ClientStateNotFoundError();

      // 7: Next mutation ID
      const nextMutationId = client.lastMutationId + 1;

      // 8: Rollback and skip if mutation is from the past (already processed)
      if (args.mutationId < nextMutationId)
        return yield* new PastMutationError({ mutationId: args.mutationId });

      // 9: Rollback if mutation is from the future
      if (args.mutationId > nextMutationId)
        return yield* new ReplicachePusherContract.FutureMutationError({
          mutationId: args.mutationId,
        });

      return { clientGroup, client, mutationId: args.mutationId };
    },
    (effect, { mutationId }) =>
      Effect.tapCause(effect, (cause) =>
        Effect.log(
          `[ReplicachePusher]: Encountered error preprocessing mutation "${mutationId}"`,
          cause,
        ),
      ),
  );

  const mutate = Effect.fn("ReplicachePusher.mutate")(
    (mutation: ReplicachePusherContract.Mutation) =>
      dispatcher.dispatch(mutation.name, mutation.args).pipe(
        // 10(ii)(a,b): Log and abort
        Effect.tapCause((cause) =>
          Effect.logError(
            `[ReplicachePusher]: Encountered error performing mutation "${mutation.id}"`,
            cause,
          ),
        ),
      ),
  );

  const postprocess = Effect.fn("ReplicachePusher.postprocess")(
    (args: Effect.Success<ReturnType<typeof preprocess>>) =>
      Effect.succeed(Version.make(args.clientGroup.clientVersion + 1)).pipe(
        Effect.map((nextClientVersion) => [
          // 11: Upsert client group
          clientGroupsRepository.upsert({
            id: args.clientGroup.id,
            tenantId: args.clientGroup.tenantId,
            userId: args.clientGroup.userId,
            clientVersion: nextClientVersion,
            clientViewVersion: args.clientGroup.clientViewVersion,
          }),

          // 12: Upsert client
          clientsRepository.upsert({
            id: args.client.id,
            tenantId: args.client.tenantId,
            clientGroupId: args.clientGroup.id,
            lastMutationId: args.mutationId,
            version: nextClientVersion,
          }),
        ]),
        Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" })),
        Effect.tapCause((cause) =>
          Effect.log(
            `[ReplicachePusher]: Encountered error postprocessing mutation "${args.mutationId}"`,
            cause,
          ),
        ),
      ),
  );

  const push = Effect.fn("ReplicachePusher.push")((request: ReplicachePusherContract.Request) =>
    Effect.succeed(request).pipe(
      Effect.filterOrFail(ReplicachePusherContract.isRequestV1, () =>
        ReplicacheContract.VersionNotSupportedError.new("push"),
      ),
      Effect.flatMap((requestV1) =>
        // oxlint-disable-next-line unicorn/no-array-for-each
        Effect.forEach(requestV1.mutations, (mutationV1) => {
          const preprocessor = preprocess({
            clientId: mutationV1.clientId,
            mutationId: mutationV1.id,
          });

          // 1, 2: Begin transaction
          return db
            .withTransaction(() =>
              preprocessor.pipe(
                Effect.tap(() => mutate(mutationV1)),
                Effect.flatMap(postprocess),
              ),
            )
            .pipe(
              Effect.catchTag("PastMutationError", Struct.get("log")),
              Effect.catch((error) =>
                Effect.log(
                  `[ReplicachePusher]: Mutation "${mutationV1.id}" failed with error:`,
                  error,
                  "[ReplicachePusher]: Retrying transaction again in error mode ...",
                ).pipe(
                  Effect.andThen(
                    // 10(ii)(c): Retry transaction again without actually performing the mutation
                    db.withTransaction(() => preprocessor.pipe(Effect.flatMap(postprocess))),
                  ),
                ),
              ),
              Effect.catchTag("PastMutationError", Struct.get("log")),
            );
        }).pipe(Effect.provideService(ReplicacheClientGroupId, requestV1.clientGroupId)),
      ),
      Effect.timed,
      Effect.flatMap(([duration]) =>
        Effect.log(
          `[ReplicachePusher]: Processed push request in ${duration.pipe(Duration.toMillis)}ms`,
        ),
      ),
      Effect.as(undefined),
      Effect.tapCause((cause) =>
        Effect.log("[ReplicachePusher]: Encountered error during push", cause),
      ),
    ),
  );

  return { push } as const;
});

/**
 * Implements the row version strategy push algorithm from the [Replicache docs](https://doc.replicache.dev/strategies/row-version#push).
 */
export const layer = makeService.pipe(Layer.effect(ReplicachePusher));
