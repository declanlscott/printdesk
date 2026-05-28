import { DynamoDBDocument } from "@effect-aws/dynamodb";
import * as Array from "effect/Array";
import * as Cause from "effect/Cause";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Number from "effect/Number";
import * as Predicate from "effect/Predicate";
import * as Redacted from "effect/Redacted";
import * as Ref from "effect/Ref";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { OrdersShortIdGenerator } from ".";
import { SstResource } from "../../sst/resource";
import { ShortId } from "../../utils";
import { Constants } from "../../utils/constants";
import { OrdersContract } from "../contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const ddb = yield* DynamoDBDocument;
  const table = yield* SstResource.useSync((resource) => resource.Dynamo.pipe(Redacted.value));

  const schedule = Schedule.recurs(Constants.DB_TRANSACTION_MAX_RETRIES).pipe(
    Schedule.both(Schedule.exponential(Duration.millis(10))),
    Schedule.jittered,
    Schedule.reduce(() => 0, Number.increment), // repetitions
    Schedule.modifyDelay((attempt, delay) =>
      Effect.logInfo(
        `[Orders.ShortIdGenerator]: Generation attempt #${attempt + 1} failed conditional check, retrying again in ${delay.pipe(Duration.format)} ...`,
      ).pipe(Effect.as(delay)),
    ),
  );

  const generate = Effect.fn("Orders.ShortIdGenerator.generate")(
    (pk: typeof OrdersContract.Item.fields.pk.Type) =>
      Schema.encodeEffect(OrdersContract.Item.fields.pk)(pk).pipe(
        Effect.flatMap((pk) =>
          ddb.query({
            TableName: table.name,
            KeyConditionExpression: "#pk = :pk",
            ExpressionAttributeNames: { "#pk": Constants.DYNAMO_KEYS.PK },
            ExpressionAttributeValues: { ":pk": pk },
            ScanIndexForward: false,
            Limit: 1,
          }),
        ),
        Effect.map(Struct.get("Items")),
        Effect.filterOrFail(Predicate.isNotUndefined, () => new Cause.NoSuchElementError()),
        Effect.map(Array.head),
        Effect.flatMap(Effect.fromOption),
        Effect.flatMap(Schema.decodeUnknownEffect(OrdersContract.Item)),
        Effect.map(Struct.get(Constants.DYNAMO_KEYS.SK)),
        Effect.catchTag("NoSuchElementError", () => Effect.succeed(ShortId.make(0))),
        Effect.flatMap(Ref.make),
        Effect.flatMap((lastId) =>
          lastId.pipe(
            Ref.updateAndGet((id) => ShortId.make(id + 1)),
            Effect.map((sk) => ({ pk, sk })),
            Effect.flatMap(Schema.encodeEffect(OrdersContract.Item)),
            Effect.flatMap((Item) =>
              ddb.put({
                TableName: table.name,
                Item,
                ConditionExpression: `attribute_not_exists(${Constants.DYNAMO_KEYS.PK})`,
              }),
            ),
            Effect.map(Struct.get("Attributes")),
            Effect.filterOrFail(Predicate.isNotUndefined, () => new Cause.NoSuchElementError()),
            Effect.flatMap(Schema.decodeUnknownEffect(OrdersContract.Item)),
            Effect.map(Struct.get(Constants.DYNAMO_KEYS.SK)),
            Effect.retry({
              while: Predicate.isTagged("ConditionalCheckFailedException"),
              schedule,
            }),
          ),
        ),
      ),
  );

  return { generate } as const;
});

export const layer = makeService.pipe(Layer.effect(OrdersShortIdGenerator));
