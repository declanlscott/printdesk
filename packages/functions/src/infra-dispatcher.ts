import { SQS } from "@effect-aws/client-sqs";
import { LambdaHandler } from "@effect-aws/lambda";
import { ColumnsContract } from "@printdesk/core/columns/contract";
import { Sst } from "@printdesk/core/sst";
import { Tenants } from "@printdesk/core/tenants";
import { TenantMetadataContract } from "@printdesk/core/tenants/contracts";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Iterable from "effect/Iterable";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as Struct from "effect/Struct";

const layer = Layer.mergeAll(
  SQS.defaultLayer,
  Tenants.MetadataRepository.Default,
).pipe(Layer.provideMerge(Sst.Resource.layer));

export const handler = LambdaHandler.make({
  layer,
  handler: () =>
    Effect.gen(function* () {
      const sqs = yield* SQS;
      const queueUrl = yield* Sst.Resource.InfraQueue.pipe(
        Effect.map(Redacted.value),
        Effect.map(Struct.get("url")),
      );

      const failedEntries = yield* Tenants.MetadataRepository.findByActive.pipe(
        Stream.fromIterableEffect,
        Stream.grouped(10),
        Stream.map(Chunk.map(Struct.pick("tenantId", "infraProgramInput"))),
        Stream.mapEffect(
          Schema.encode(
            Schema.parseJson(
              Schema.Struct({
                tenantId: ColumnsContract.TenantId,
                infraProgramInput: TenantMetadataContract.InfraProgramInput,
              }),
            ).pipe(Schema.Chunk),
          ),
        ),
        Stream.mapEffect(
          (messages) =>
            sqs.sendMessageBatch({
              QueueUrl: queueUrl,
              Entries: messages.map((message, index) => ({
                Id: index.toString(),
                MessageBody: message,
              })),
            }),
          { concurrency: "unbounded" },
        ),
        Stream.runCollect,
        Effect.map(Iterable.flatMap((output) => output.Failed ?? [])),
      );

      return { success: Iterable.isEmpty(failedEntries) };
    }),
});
