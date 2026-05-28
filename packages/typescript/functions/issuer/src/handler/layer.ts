import * as ClientsRepository from "@printdesk/core/clients/repository/layer";
import * as Crypto from "@printdesk/core/crypto/layer";
import { Database } from "@printdesk/core/database";
import { Drizzle } from "@printdesk/core/database/drizzle";
import * as PgClient from "@printdesk/core/database/postgres";
import * as IdentityProvidersRepository from "@printdesk/core/identity/providers-repository/layer";
import * as Oauth from "@printdesk/core/oauth/layer";
import { SstResource } from "@printdesk/core/sst/resource";
import * as SyncQueryBuilder from "@printdesk/core/sync/query-builder/layer";
import * as UsersRepository from "@printdesk/core/users/repository/layer";
import * as Layer from "effect/Layer";

export const layer = Oauth.layer.pipe(
  Layer.provide(ClientsRepository.layer),
  Layer.provide(IdentityProvidersRepository.layer),
  Layer.provide(UsersRepository.layer),
  Layer.provide(SyncQueryBuilder.layer),
  Layer.provideMerge(Crypto.layer),
  Layer.provideMerge(Database.layer),
  Layer.provide(Drizzle.layerWithDrizzleServices),
  Layer.provide(PgClient.layer),
  Layer.provideMerge(SstResource.layer),
);
