import { DynamoDBDocument } from "@effect-aws/dynamodb";
import { Database } from "@printdesk/core/database";
import { Drizzle } from "@printdesk/core/database/drizzle";
import * as PgClient from "@printdesk/core/database/postgres";
import { SstResource } from "@printdesk/core/sst/resource";
import * as Layer from "effect/Layer";

export const databaseLayer = Database.layer.pipe(
  Layer.provide(Drizzle.layerWithDrizzleServices),
  Layer.provide(PgClient.layer),
  Layer.provide(SstResource.layer),
);

export const dynamoLayer = DynamoDBDocument.defaultLayer;
