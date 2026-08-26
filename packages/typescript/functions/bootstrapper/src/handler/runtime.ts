import { DynamoDBDocument } from "@effect-aws/dynamodb";
import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import { ActorLayerMap } from "@printdesk/core/actors";
import * as ApiUrlBuilder from "@printdesk/core/api/url-builder/layer";
import { Appconfig } from "@printdesk/core/aws/appconfig";
import { AppconfigAgent } from "@printdesk/core/aws/appconfig/agent";
import { AppconfigCredentialIdentityProviderLayerMap } from "@printdesk/core/aws/credential-identity/appconfig";
import { AppsyncPublisherCredentialIdentityProviderLayerMap } from "@printdesk/core/aws/credential-identity/appsync";
import { AppsyncSigner } from "@printdesk/core/aws/sigv4-signers/appsync";
import * as ClientsRepository from "@printdesk/core/clients/repository/layer";
import * as Config from "@printdesk/core/config/layer";
import * as Crypto from "@printdesk/core/crypto/layer";
import { Database } from "@printdesk/core/database";
import { Drizzle } from "@printdesk/core/database/drizzle";
import * as PgClient from "@printdesk/core/database/postgres";
import { Graph } from "@printdesk/core/graph";
import * as GroupMembershipsRepositories from "@printdesk/core/groups/memberships/repositories/layers";
import * as GroupsRepositories from "@printdesk/core/groups/repositories/layers";
import * as IdentityRepository from "@printdesk/core/identity/repository/layer";
import * as LicensesManager from "@printdesk/core/licenses/manager/layer";
import * as LicensesRepository from "@printdesk/core/licenses/repository/layer";
import { Oauth } from "@printdesk/core/oauth";
import * as PapercutMfApi from "@printdesk/core/papercut-mf/api/layer";
import * as PapercutMfSynchronizer from "@printdesk/core/papercut-mf/synchronizer/layer";
import { Realtime } from "@printdesk/core/realtime";
import * as ReplicacheNotifier from "@printdesk/core/replicache/notifier/layer";
import * as ScimLocator from "@printdesk/core/scim/locator/layer";
import * as SharedAccountCustomerAccessRepositories from "@printdesk/core/shared-accounts/customer-access/repositories/layers";
import * as SharedAccountGroupCustomerAccessRepositories from "@printdesk/core/shared-accounts/group-customer-access/repositories/layers";
import * as SharedAccountsRepositories from "@printdesk/core/shared-accounts/repositories/layers";
import { SstResource } from "@printdesk/core/sst/resource";
import * as TenantsRepositories from "@printdesk/core/tenants/repositories/layers";
import * as UsersRepositories from "@printdesk/core/users/repositories/layers";
import { Xml } from "@printdesk/core/xml";
import { XmlRpc } from "@printdesk/core/xml/rpc";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";

import { openauthLayer } from "../lib/auth";

export const layer = Layer.mergeAll(
  Oauth.AccessTokenLayerMap.layer,
  ActorLayerMap.layer,
  AppconfigCredentialIdentityProviderLayerMap.layer,
  AppsyncPublisherCredentialIdentityProviderLayerMap.layer,
  ClientsRepository.layer,
  DynamoDBDocument.defaultLayer,
  LicensesManager.layer,
  openauthLayer,
  PapercutMfSynchronizer.layer,
  ReplicacheNotifier.layer,
).pipe(
  Layer.provideMerge([
    Crypto.layer,
    IdentityRepository.providersRepositoryLayer,
    Realtime.layer,
    TenantsRepositories.repositoryLayer,
  ]),
  Layer.provide([
    GroupMembershipsRepositories.repositoryLayer,
    GroupsRepositories.repositoryLayer,
    Graph.layer,
    LicensesRepository.layer,
    PapercutMfApi.layer,
    SharedAccountCustomerAccessRepositories.repositoryLayer,
    SharedAccountGroupCustomerAccessRepositories.repositoryLayer,
    SharedAccountsRepositories.repositoryLayer,
    UsersRepositories.repositoryLayer,
    NodeCrypto.layer,
  ]),
  Layer.provide([AppsyncSigner.layer, ScimLocator.layer, XmlRpc.XmlRpc.layer]),
  Layer.provideMerge([Config.layer, Database.layer]),
  Layer.provide([
    ApiUrlBuilder.layer,
    Appconfig.layer,
    AppconfigAgent.layer,
    Drizzle.layerWithDrizzleServices,
    Xml.Builder.layer,
    Xml.Parser.layer,
  ]),
  Layer.provide([FetchHttpClient.layer, PgClient.layer]),
  Layer.provideMerge(SstResource.layer),
);

export const runtime = layer.pipe(ManagedRuntime.make, (runtime) => {
  function signalListener(signal: globalThis.NodeJS.Signals) {
    Console.log(`[runtime]: ${signal} received`).pipe(
      Effect.andThen(Console.log(`[runtime]: cleaning up`)),
      Effect.andThen(runtime.disposeEffect),
      Effect.andThen(Console.log(`[runtime]: exiting`)),
      // @effect-diagnostics-next-line lazyPromiseInEffectSync:off
      // oxlint-disable-next-line unicorn/no-process-exit
      Effect.andThen(Effect.sync(() => globalThis.process.exit(0))),
      Effect.runFork,
    );
  }

  globalThis.process.on("SIGTERM", signalListener);
  globalThis.process.on("SIGINT", signalListener);

  return runtime;
});
