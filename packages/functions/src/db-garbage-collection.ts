import { LambdaHandler } from "@effect-aws/lambda";
import * as Logger from "@effect-aws/powertools-logger";
import { Database } from "@printdesk/core/database2";
import { Replicache } from "@printdesk/core/replicache2";
import { Sst } from "@printdesk/core/sst";
import * as Array from "effect/Array";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";
import * as Struct from "effect/Struct";

const layer = Layer.mergeAll(
  Replicache.ClientGroupsRepository.Default,
  Replicache.ClientsRepository.Default,
  Replicache.ClientViewsRepository.Default,
  Replicache.ClientViewEntriesRepository.Default,
  Logger.defaultLayer,
).pipe(Layer.provideMerge(Sst.Resource.layer));

export const handler = LambdaHandler.make({
  layer,
  handler: () =>
    Database.paginateTransaction(
      Replicache.ClientGroupsRepository.deleteExpired,
    ).pipe(
      Stream.runCollect,
      Effect.map(Chunk.map(Struct.get("id"))),
      Effect.map(Array.fromIterable),
      Effect.map((ids) =>
        Array.make(
          Database.paginateTransaction(
            Replicache.ClientsRepository.deleteByGroupIds(ids),
          ).pipe(Stream.runDrain),
          Database.paginateTransaction(
            Replicache.ClientViewsRepository.deleteByGroupIds(ids),
          ).pipe(Stream.runDrain),
          Database.paginateTransaction(
            Replicache.ClientViewEntriesRepository.deleteByGroupIds(ids),
          ).pipe(Stream.runDrain),
        ),
      ),
      Effect.flatMap(
        Effect.allWith({ concurrency: "unbounded", discard: true }),
      ),
    ),
});
