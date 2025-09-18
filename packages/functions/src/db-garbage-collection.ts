import { LambdaHandler } from "@effect-aws/lambda";
import * as Logger from "@effect-aws/powertools-logger";
import { Replicache } from "@printdesk/core/replicache2";
import { Constants } from "@printdesk/core/utils/constants";
import { paginate } from "@printdesk/core/utils2";
import { Array, Chunk, Effect, Layer, Stream, Struct } from "effect";

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
    Replicache.ClientGroupsRepository.pipe(
      Effect.flatMap((repository) =>
        paginate(
          repository.deleteExpired,
          Constants.DB_TRANSACTION_ROW_MODIFICATION_LIMIT,
        ).pipe(Stream.runCollect),
      ),
      Effect.map(Chunk.map(Struct.get("id"))),
      Effect.map(Array.fromIterable),
      Effect.map((ids) =>
        Array.make(
          Replicache.ClientsRepository.pipe(
            Effect.flatMap((repository) =>
              paginate(
                repository.deleteByGroupIds(ids),
                Constants.DB_TRANSACTION_ROW_MODIFICATION_LIMIT,
              ).pipe(Stream.runDrain),
            ),
          ),
          Replicache.ClientViewsRepository.pipe(
            Effect.flatMap((repository) =>
              paginate(
                repository.deleteByGroupIds(ids),
                Constants.DB_TRANSACTION_ROW_MODIFICATION_LIMIT,
              ).pipe(Stream.runDrain),
            ),
          ),
          Replicache.ClientViewMetadataRepository.pipe(
            Effect.flatMap((repository) =>
              paginate(
                repository.deleteByGroupIds(ids),
                Constants.DB_TRANSACTION_ROW_MODIFICATION_LIMIT,
              ).pipe(Stream.runDrain),
            ),
          ),
        ),
      ),
      Effect.flatMap(
        Effect.allWith({ concurrency: "unbounded", discard: true }),
      ),
    ),
});
