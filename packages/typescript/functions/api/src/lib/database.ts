import { DynamoDBDocument } from "@effect-aws/dynamodb";
import { nodeCredentialIdentityProviderLayer } from "@printdesk/core/aws/credential-identity/node";
import * as DsqlSigner from "@printdesk/core/aws/dsql-signer/layer";
import { Database } from "@printdesk/core/database";
import { Drizzle } from "@printdesk/core/database/drizzle";
import * as PgClient from "@printdesk/core/database/pg-client";
import { SstResource } from "@printdesk/core/sst/resource";
import * as Duration from "effect/Duration";
import * as Layer from "effect/Layer";

export const databaseLayer = Database.layer.pipe(
  Layer.provide(Drizzle.layerWithDrizzleServices),
  Layer.provide(PgClient.layer),
  Layer.provide(DsqlSigner.layer({ expiresIn: Duration.minutes(15) })),
  Layer.provide([nodeCredentialIdentityProviderLayer, SstResource.layer]),
);

export const dynamoLayer = DynamoDBDocument.defaultLayer;
