import { Appconfig } from "@printdesk/core/aws/appconfig";
import { AppconfigAgent } from "@printdesk/core/aws/appconfig/agent";
import * as Config from "@printdesk/core/config/layer";
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

import { databaseLayer } from "./database";

export const papercutApiLayer = PapercutApi.layer.pipe(
  Layer.provide([Config.layer, XmlRpc.XmlRpc.layer("/")]),
  Layer.provide([Appconfig.layer, AppconfigAgent.layer, Xml.Builder.layer, Xml.Parser.layer]),
  Layer.provide([FetchHttpClient.layer, SstResource.layer]),
);

export const papercutSyncerLayer = PapercutSyncer.layer.pipe(
  Layer.provide([
    CustomerGroupMembershipsRepository.layer,
    CustomerGroupsRepository.layer,
    IdentityProvidersRepository.layer,
    papercutApiLayer,
    SharedAccountCustomerAccessRepository.layer,
    SharedAccountCustomerGroupAccessRepository.layer,
    SharedAccountsRepository.layer,
    UsersRepository.layer,
  ]),
  Layer.provide(SyncQueryBuilder.layer),
  Layer.provide(databaseLayer),
);
