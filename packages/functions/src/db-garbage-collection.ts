import { LambdaHandler } from "@effect-aws/lambda";
import * as Logger from "@effect-aws/powertools-logger";
import { Database } from "@printdesk/core/database2";
import { Replicache } from "@printdesk/core/replicache2";
import { Array, Effect, Layer } from "effect";

const layer = Layer.mergeAll(
  Replicache.ClientGroupsRepository.Default,
  Replicache.ClientsRepository.Default,
  Replicache.ClientViewsRepository.Default,
  Replicache.ClientViewMetadataRepository.Default,
  Database.TransactionManager.Default,
  Logger.defaultLayer,
);

export const handler = LambdaHandler.make({
  layer,
  handler: () =>
    Effect.gen(function* () {
      const db = yield* Database.TransactionManager;

      const replicacheClientGroupsRepository =
        yield* Replicache.ClientGroupsRepository;
      const replicacheClientsRepository = yield* Replicache.ClientsRepository;
      const replicacheClientViewsRepository =
        yield* Replicache.ClientViewsRepository;
      const replicacheClientViewMetadataRepository =
        yield* Replicache.ClientViewMetadataRepository;

      yield* db.withTransaction(() =>
        Effect.gen(function* () {
          const expiredGroupIds = yield* replicacheClientGroupsRepository
            .deleteExpired()
            .pipe(Effect.map(Array.map(({ id }) => id)));

          yield* Effect.all(
            [
              replicacheClientsRepository.deleteByGroupIds(expiredGroupIds),
              replicacheClientViewsRepository.deleteByGroupIds(expiredGroupIds),
              replicacheClientViewMetadataRepository.deleteByGroupIds(
                expiredGroupIds,
              ),
            ],
            { concurrency: "unbounded" },
          );
        }),
      );
    }),
});
