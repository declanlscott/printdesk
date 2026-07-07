import { ActorLayerMap } from "@printdesk/core/actors";
import { Appconfig } from "@printdesk/core/aws/appconfig";
import { AppconfigAgent } from "@printdesk/core/aws/appconfig/agent";
import { AppsyncPublisherCredentialIdentityProviderLayerMap } from "@printdesk/core/aws/credential-identity/appsync";
import { AppsyncSigner } from "@printdesk/core/aws/sigv4-signers/appsync";
import * as ClientsRepository from "@printdesk/core/clients/repository/layer";
import * as Config from "@printdesk/core/config/layer";
import { Database } from "@printdesk/core/database";
import { Drizzle } from "@printdesk/core/database/drizzle";
import * as PgClient from "@printdesk/core/database/postgres";
import { Graph } from "@printdesk/core/graph";
import * as CustomerGroupMembershipsRepository from "@printdesk/core/groups/customer-memberships/repository/layer";
import * as CustomerGroupsRepository from "@printdesk/core/groups/customers/repository/layer";
import { EntraId } from "@printdesk/core/identity/entra-id";
import * as IdentityProvidersRepository from "@printdesk/core/identity/providers-repository/layer";
import { Oauth } from "@printdesk/core/oauth";
import * as PapercutMfApi from "@printdesk/core/papercut-mf/api/layer";
import * as PapercutMfSyncer from "@printdesk/core/papercut-mf/syncer/layer";
import { Realtime } from "@printdesk/core/realtime";
import * as ReplicacheNotifier from "@printdesk/core/replicache/notifier/layer";
import * as SharedAccountCustomerAccessRepository from "@printdesk/core/shared-accounts/customer-access/repository/layer";
import * as SharedAccountCustomerGroupAccessRepository from "@printdesk/core/shared-accounts/customer-group-access/repository/layer";
import * as SharedAccountsRepository from "@printdesk/core/shared-accounts/repository/layer";
import { SstResource } from "@printdesk/core/sst/resource";
import * as SyncQueryBuilder from "@printdesk/core/sync/query-builder/layer";
import * as TenantsRepository from "@printdesk/core/tenants/repository/layer";
import * as UsersRepository from "@printdesk/core/users/repository/layer";
import { Xml } from "@printdesk/core/xml";
import { XmlRpc } from "@printdesk/core/xml/rpc";
import * as Layer from "effect/Layer";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";

import { openauthLayer } from "../lib/auth";

export const layer = Layer.mergeAll(
  Oauth.AccessTokenLayerMap.layer,
  AppsyncPublisherCredentialIdentityProviderLayerMap.layer,
  ActorLayerMap.layer,
  ClientsRepository.layer,
  openauthLayer,
  PapercutMfSyncer.layer,
  ReplicacheNotifier.layer,
  TenantsRepository.layer,
).pipe(
  Layer.provide([
    CustomerGroupMembershipsRepository.layer,
    CustomerGroupsRepository.layer,
    Graph.layer,
    IdentityProvidersRepository.layer,
    PapercutMfApi.layer,
    Realtime.layer,
    SharedAccountCustomerAccessRepository.layer,
    SharedAccountCustomerGroupAccessRepository.layer,
    SharedAccountsRepository.layer,
    UsersRepository.layer,
  ]),
  Layer.provideMerge([Config.layer, EntraId.AuthProviderLayerMap.layer]),
  Layer.provide([
    Appconfig.layer,
    AppconfigAgent.layer,
    AppsyncSigner.layer,
    SyncQueryBuilder.layer,
    XmlRpc.XmlRpc.layer,
  ]),
  Layer.provide([Database.layer, Xml.Builder.layer, Xml.Parser.layer]),
  Layer.provide([Drizzle.layerWithDrizzleServices, FetchHttpClient.layer]),
  Layer.provide(PgClient.layer),
  Layer.provideMerge(SstResource.layer),
);
