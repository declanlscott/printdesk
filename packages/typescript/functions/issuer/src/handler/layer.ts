import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as ClientsRepository from "@printdesk/core/clients/repository/layer";
import * as Crypto from "@printdesk/core/crypto/layer";
import { Database } from "@printdesk/core/database";
import { Drizzle } from "@printdesk/core/database/drizzle";
import * as PgClient from "@printdesk/core/database/postgres";
import * as IdentityRepository from "@printdesk/core/identity/repository/layer";
import * as Oauth from "@printdesk/core/oauth/layer";
import { SstResource } from "@printdesk/core/sst/resource";
import * as SyncQueryBuilder from "@printdesk/core/sync/query-builder/layer";
import * as Layer from "effect/Layer";

export const layer = Oauth.layer.pipe(
  Layer.provide([ClientsRepository.layer, Crypto.layer, SyncQueryBuilder.layer]),
  Layer.provideMerge(IdentityRepository.providersRepositoryLayer),
  Layer.provide(Database.layer),
  Layer.provide([Drizzle.layerWithDrizzleServices, NodeCrypto.layer]),
  Layer.provide(PgClient.layer),
  Layer.provideMerge(SstResource.layer),
);
