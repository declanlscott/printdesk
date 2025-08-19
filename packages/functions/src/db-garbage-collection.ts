import { LambdaHandler } from "@effect-aws/lambda";
import * as Logger from "@effect-aws/powertools-logger";
import { Replicache } from "@printdesk/core/replicache2";
import { Constants } from "@printdesk/core/utils/constants";
import { paginate } from "@printdesk/core/utils2";
import { Array, Effect, Layer } from "effect";

const layer = Layer.mergeAll(
  Replicache.ClientGroupsRepository.Default,
  Replicache.ClientsRepository.Default,
  Replicache.ClientViewsRepository.Default,
  Replicache.ClientViewMetadataRepository.Default,
  Logger.defaultLayer,
);

export const handler = LambdaHandler.make({
  layer,
  handler: () =>
    Effect.gen(function* () {
      const replicacheClientGroupsRepository =
        yield* Replicache.ClientGroupsRepository;
      const replicacheClientsRepository = yield* Replicache.ClientsRepository;
      const replicacheClientViewsRepository =
        yield* Replicache.ClientViewsRepository;
      const replicacheClientViewMetadataRepository =
        yield* Replicache.ClientViewMetadataRepository;

      const expiredGroupIds = yield* paginate(
        replicacheClientGroupsRepository.deleteExpired(),
        Constants.DB_TRANSACTION_ROW_MODIFICATION_LIMIT,
      ).pipe(Effect.map(Array.map(({ id }) => id)));

      yield* Effect.all(
        [
          paginate(
            replicacheClientsRepository.deleteByGroupIds(expiredGroupIds),
            Constants.DB_TRANSACTION_ROW_MODIFICATION_LIMIT,
          ),
          paginate(
            replicacheClientViewsRepository.deleteByGroupIds(expiredGroupIds),
            Constants.DB_TRANSACTION_ROW_MODIFICATION_LIMIT,
          ),
          paginate(
            replicacheClientViewMetadataRepository.deleteByGroupIds(
              expiredGroupIds,
            ),
            Constants.DB_TRANSACTION_ROW_MODIFICATION_LIMIT,
          ),
        ],
        { concurrency: "unbounded" },
      );
    }),
});
