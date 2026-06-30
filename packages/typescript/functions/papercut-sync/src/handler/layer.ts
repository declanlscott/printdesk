import { Appconfig } from "@printdesk/core/aws/appconfig";
import { AppconfigAgent } from "@printdesk/core/aws/appconfig/agent";
import * as ClientsRepository from "@printdesk/core/clients/repository/layer";
import * as Config from "@printdesk/core/config/layer";
import { Database } from "@printdesk/core/database";
import { Drizzle } from "@printdesk/core/database/drizzle";
import * as PgClient from "@printdesk/core/database/postgres";
import { GraphLayerMap } from "@printdesk/core/graph";
import * as CustomerGroupMembershipsRepository from "@printdesk/core/groups/customer-memberships/repository/layer";
import * as CustomerGroupsRepository from "@printdesk/core/groups/customers/repository/layer";
import * as IdentityProvidersRepository from "@printdesk/core/identity/providers-repository/layer";
import * as PapercutApi from "@printdesk/core/papercut/api/layer";
import * as PapercutSyncer from "@printdesk/core/papercut/syncer/layer";
import * as SharedAccountCustomerAccessRepository from "@printdesk/core/shared-accounts/customer-access/repository/layer";
import * as SharedAccountCustomerGroupAccessRepository from "@printdesk/core/shared-accounts/customer-group-access/repository/layer";
import * as SharedAccountsRepository from "@printdesk/core/shared-accounts/repository/layer";
import { SstResource } from "@printdesk/core/sst/resource";
import * as SyncQueryBuilder from "@printdesk/core/sync/query-builder/layer";
import * as UsersRepository from "@printdesk/core/users/repository/layer";
import { Xml } from "@printdesk/core/xml";
import { XmlRpc } from "@printdesk/core/xml/rpc";
import * as Layer from "effect/Layer";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";

import { openauthLayer } from "../lib/auth";

export const layer = PapercutSyncer.layer.pipe(
  Layer.merge([ClientsRepository.layer, GraphLayerMap.layer, openauthLayer]),
  Layer.provide([
    CustomerGroupMembershipsRepository.layer,
    CustomerGroupsRepository.layer,
    IdentityProvidersRepository.layer,
    PapercutApi.layer,
    SharedAccountCustomerAccessRepository.layer,
    SharedAccountCustomerGroupAccessRepository.layer,
    SharedAccountsRepository.layer,
    UsersRepository.layer,
  ]),
  Layer.provideMerge([Config.layer]),
  Layer.provide([SyncQueryBuilder.layer, XmlRpc.XmlRpc.layer("/")]),
  Layer.provide([
    Appconfig.layer,
    AppconfigAgent.layer,
    Database.layer,
    Xml.Builder.layer,
    Xml.Parser.layer,
  ]),
  Layer.provide([Drizzle.layerWithDrizzleServices, FetchHttpClient.layer]),
  Layer.provide(PgClient.layer),
  Layer.provide(SstResource.layer),
);
