import { STS } from "@effect-aws/client-sts";
import { LambdaHandler } from "@effect-aws/lambda";
import { Actors } from "@printdesk/core/actors";
import { Credentials } from "@printdesk/core/aws";
import { Database } from "@printdesk/core/database";
import { Invoices } from "@printdesk/core/invoices";
import { InvoicesContract } from "@printdesk/core/invoices/contract";
import { Papercut } from "@printdesk/core/papercut";
import { Sst } from "@printdesk/core/sst";
import * as Array from "effect/Array";
import * as Chunk from "effect/Chunk";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as Struct from "effect/Struct";

import type { EffectHandler, SQSEvent } from "@effect-aws/lambda";
import type { SQSBatchItemFailure } from "aws-lambda";

const layer = Layer.mergeAll(
  Database.TransactionManager.Default,
  Invoices.Repository.Default,
  STS.defaultLayer,
).pipe(Layer.provideMerge(Sst.Resource.Default));

const effectHandler: EffectHandler<
  SQSEvent,
  Layer.Layer.Success<typeof layer>,
  Layer.Layer.Error<typeof layer>
> = (event) =>
  Effect.gen(function* () {
    const db = yield* Database.TransactionManager;
    const invoicesRepository = yield* Invoices.Repository;
    const sts = yield* STS;
    const resource = yield* Sst.Resource;

    const decode = Schema.decode(InvoicesContract.ProcessInvoicePayload);

    const accountId = resource.Aws.pipe(Redacted.value).account.id;

    const batchItemFailures = yield* Stream.fromIterable(event.Records).pipe(
      Stream.mapEffect(
        (record) =>
          decode(record.body).pipe(
            Effect.flatMap((payload) =>
              db.withTransaction(() =>
                Effect.gen(function* () {
                  const { invoice, sharedAccount } =
                    yield* invoicesRepository.findByIdForUpdateWithSharedAccount(
                      payload.invoiceId,
                      payload.tenantId,
                    );

                  const credentials = yield* sts
                    .assumeRole({
                      RoleArn: Credentials.buildRoleArn(
                        accountId,
                        resource.TenantRoles.pipe(Redacted.value).apiAccess
                          .nameTemplate,
                        payload.tenantId,
                      ),
                      RoleSessionName: "InvoicesProcessor",
                    })
                    .pipe(
                      Effect.map(Struct.get("Credentials")),
                      Effect.flatMap(
                        Schema.decodeUnknown(
                          Schema.Struct({
                            accessKeyId: Schema.propertySignature(
                              Schema.String,
                            ).pipe(Schema.fromKey("AccessKeyId")),
                            secretAccessKey: Schema.propertySignature(
                              Schema.String,
                            ).pipe(Schema.fromKey("SecretAccessKey")),
                            sessionToken: Schema.propertySignature(
                              Schema.String.pipe(Schema.UndefinedOr),
                            ).pipe(Schema.fromKey("SessionToken")),
                            expiration: Schema.propertySignature(
                              Schema.Date,
                            ).pipe(Schema.fromKey("Expiration")),
                          }),
                        ),
                      ),
                    );

                  const cost = Array.reduce(
                    invoice.lineItems,
                    0,
                    (total, lineItem) => total + lineItem.cost,
                  );

                  const papercut = yield* Papercut.WebServicesClient.pipe(
                    Effect.provide(
                      Papercut.WebServicesClient.Default.pipe(
                        Layer.provide(
                          Actors.Actor.systemLayer(payload.tenantId),
                        ),
                        Layer.provide(
                          Credentials.Credentials.layer(credentials),
                        ),
                      ),
                    ),
                  );

                  yield* papercut.adjustSharedAccountAccountBalance(
                    sharedAccount.name,
                    cost,
                    `invoice:${invoice.id}, order:${invoice.orderId} (via printdesk)`,
                  );

                  return undefined;
                }).pipe(
                  Effect.tapBoth({
                    onFailure: (error) =>
                      Effect.logError(
                        `Failed processing invoice ${payload.invoiceId}`,
                        error,
                      ).pipe(
                        Effect.andThen(
                          invoicesRepository.updateById(
                            payload.invoiceId,
                            { status: "error", chargedAt: null },
                            payload.tenantId,
                          ),
                        ),
                      ),
                    onSuccess: () =>
                      DateTime.now.pipe(
                        Effect.flatMap((chargedAt) =>
                          invoicesRepository.updateById(
                            payload.invoiceId,
                            { status: "charged", chargedAt },
                            payload.tenantId,
                          ),
                        ),
                      ),
                  }),
                ),
              ),
            ),
            Effect.catchAllCause((cause) =>
              Effect.logError(
                `Failed processing message ${record.messageId}`,
                cause,
              ).pipe(
                Effect.as({
                  itemIdentifier: record.messageId,
                } satisfies SQSBatchItemFailure),
              ),
            ),
          ),
        { concurrency: "unbounded" },
      ),
      Stream.filter(Predicate.isNotUndefined),
      Stream.runCollect,
      Effect.map(Chunk.toArray),
    );

    return { batchItemFailures };
  });

export const handler = LambdaHandler.make({
  layer,
  handler: effectHandler,
});
