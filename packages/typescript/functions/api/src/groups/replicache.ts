import * as AnnouncementsMutations from "@printdesk/core/announcements/mutations/layer";
import * as AnnouncementsPolicies from "@printdesk/core/announcements/policies/layer";
import * as AnnouncementsRepository from "@printdesk/core/announcements/repository/layer";
import * as AnnouncementsSync from "@printdesk/core/announcements/sync/layer";
import { Api } from "@printdesk/core/api";
import * as CommentsMutations from "@printdesk/core/comments/mutations/layer";
import * as CommentsPolicies from "@printdesk/core/comments/policies/layer";
import * as CommentsRepository from "@printdesk/core/comments/repository/layer";
import * as CommentsSync from "@printdesk/core/comments/sync/layer";
import * as DeliveryOptionsMutations from "@printdesk/core/delivery-options/mutations/layer";
import * as DeliveryOptionsPolicies from "@printdesk/core/delivery-options/policies/layer";
import * as DeliveryOptionsRepository from "@printdesk/core/delivery-options/repository/layer";
import * as DeliveryOptionsSync from "@printdesk/core/delivery-options/sync/layer";
import * as CustomerGroupMembershipsRepository from "@printdesk/core/groups/customer-memberships/repository/layer";
import * as CustomerGroupMembershipsSync from "@printdesk/core/groups/customer-memberships/sync/layer";
import * as CustomerGroupsRepository from "@printdesk/core/groups/customers/repository/layer";
import * as CustomerGroupsSync from "@printdesk/core/groups/customers/sync/layer";
import * as InvoicesMutations from "@printdesk/core/invoices/mutations/layer";
import * as InvoicesRepository from "@printdesk/core/invoices/repository/layer";
import * as InvoicesSync from "@printdesk/core/invoices/sync/layer";
import * as MutationsDispatcher from "@printdesk/core/mutations/dispatcher/layer";
import * as OrdersMutations from "@printdesk/core/orders/mutations/layer";
import * as OrdersPolicies from "@printdesk/core/orders/policies/layer";
import * as OrdersRepository from "@printdesk/core/orders/repository/layer";
import * as OrdersShortIdGenerator from "@printdesk/core/orders/short-id-generator/layer";
import * as OrdersSync from "@printdesk/core/orders/sync/layer";
import * as ProductsMutations from "@printdesk/core/products/mutations/layer";
import * as ProductsPolicies from "@printdesk/core/products/policies/layer";
import * as ProductsRepository from "@printdesk/core/products/repository/layer";
import * as ProductsSync from "@printdesk/core/products/sync/layer";
import { ReplicachePullerContract } from "@printdesk/core/replicache/contracts";
import * as ReplicacheNotifier from "@printdesk/core/replicache/notifier/layer";
import { ReplicachePuller } from "@printdesk/core/replicache/puller";
import * as Puller from "@printdesk/core/replicache/puller/layer";
import { ReplicachePusher } from "@printdesk/core/replicache/pusher";
import * as Pusher from "@printdesk/core/replicache/pusher/layer";
import * as ReplicacheClientGroupsRepository from "@printdesk/core/replicache/repositories/client-groups/layer";
import * as ReplicacheClientViewEntriesRepository from "@printdesk/core/replicache/repositories/client-view-entries/layer";
import * as ReplicacheClientViewsRepository from "@printdesk/core/replicache/repositories/client-views/layer";
import * as ReplicacheClientsRepository from "@printdesk/core/replicache/repositories/clients/layer";
import * as RoomsMutations from "@printdesk/core/rooms/mutations/layer";
import * as RoomsPolicies from "@printdesk/core/rooms/policies/layer";
import * as RoomsRepository from "@printdesk/core/rooms/repository/layer";
import * as RoomsSync from "@printdesk/core/rooms/sync/layer";
import * as SharedAccountCustomerAccessRepository from "@printdesk/core/shared-accounts/customer-access/repository/layer";
import * as SharedAccountCustomerAccessSync from "@printdesk/core/shared-accounts/customer-access/sync/layer";
import * as SharedAccountCustomerGroupAccessRepository from "@printdesk/core/shared-accounts/customer-group-access/repository/layer";
import * as SharedAccountCustomerGroupAccessSync from "@printdesk/core/shared-accounts/customer-group-access/sync/layer";
import * as SharedAccountManagerAccessMutations from "@printdesk/core/shared-accounts/manager-access/mutations/layer";
import * as SharedAccountManagerAccessPolicies from "@printdesk/core/shared-accounts/manager-access/policies/layer";
import * as SharedAccountManagerAccessRepository from "@printdesk/core/shared-accounts/manager-access/repository/layer";
import * as SharedAccountManagerAccessSync from "@printdesk/core/shared-accounts/manager-access/sync/layer";
import * as SharedAccountsMutations from "@printdesk/core/shared-accounts/mutations/layer";
import * as SharedAccountsPolicies from "@printdesk/core/shared-accounts/policies/layer";
import * as SharedAccountsRepository from "@printdesk/core/shared-accounts/repository/layer";
import * as SharedAccountsSync from "@printdesk/core/shared-accounts/sync/layer";
import { SstResource } from "@printdesk/core/sst/resource";
import * as SyncQueryBuilder from "@printdesk/core/sync/query-builder/layer";
import * as Syncer from "@printdesk/core/sync/syncer/layer";
import * as TenantsMutations from "@printdesk/core/tenants/mutations/layer";
import * as TenantsRepository from "@printdesk/core/tenants/repository/layer";
import * as TenantsSync from "@printdesk/core/tenants/sync/layer";
import * as UsersMutations from "@printdesk/core/users/mutations/layer";
import * as UsersPolicies from "@printdesk/core/users/policies/layer";
import * as UsersRepository from "@printdesk/core/users/repository/layer";
import * as UsersSync from "@printdesk/core/users/sync/layer";
import * as RoomWorkflowsRepository from "@printdesk/core/workflows/room/repository/layer";
import * as RoomWorkflowsSync from "@printdesk/core/workflows/room/sync/layer";
import * as SharedAccountWorkflowsPolicies from "@printdesk/core/workflows/shared-account/policies/layer";
import * as SharedAccountWorkflowsRepository from "@printdesk/core/workflows/shared-account/repository/layer";
import * as SharedAccountWorkflowsSync from "@printdesk/core/workflows/shared-account/sync/layer";
import * as WorkflowStatusesMutations from "@printdesk/core/workflows/status/mutations/layer";
import * as WorkflowStatusesPolicies from "@printdesk/core/workflows/status/policies/layer";
import * as WorkflowStatusesRepository from "@printdesk/core/workflows/status/repository/layer";
import * as WorkflowStatusesSync from "@printdesk/core/workflows/status/sync/layer";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { databaseLayer, dynamoLayer } from "../lib/database";
import { realtimeLayer } from "../lib/realtime";
import { realtimePublisherAwsCredentialIdentityLayer } from "../middleware/aws-credential-identity/realtime-publisher";

export const baseReplicacheGroupLayer = HttpApiBuilder.group(
  Api,
  "Replicache",
  Effect.fn(function* (handlers) {
    const puller = yield* ReplicachePuller;
    const pusher = yield* ReplicachePusher;

    return handlers
      .handle(
        "pull",
        Effect.fn("Api.Replicache.pull")(({ payload }) =>
          puller.pull(payload).pipe(
            Effect.catchTags({
              ClientStateNotFoundError: (e) => Effect.succeed(e.response),
              VersionNotSupportedError: (e) => Effect.succeed(e.response),
              EffectDrizzleQueryError: () => new HttpApiError.InternalServerError(),
              SqlError: () => new HttpApiError.InternalServerError(),
              DsqlError: () => new HttpApiError.InternalServerError(),
              QueryBuilderError: () => new HttpApiError.InternalServerError(),
            }),
            Effect.flatMap(Schema.encodeEffect(ReplicachePullerContract.Response)),
            Effect.catchTag("SchemaError", () => new HttpApiError.InternalServerError()),
          ),
        ),
      )
      .handle(
        "push",
        Effect.fn("Api.Replicache.push")(({ payload }) =>
          pusher.push(payload).pipe(
            Effect.catchTags({
              ClientStateNotFoundError: (e) => Effect.succeed(e.response),
              VersionNotSupportedError: (e) => Effect.succeed(e.response),
              EffectDrizzleQueryError: () => new HttpApiError.InternalServerError(),
              SqlError: () => new HttpApiError.InternalServerError(),
              DsqlError: () => new HttpApiError.InternalServerError(),
            }),
          ),
        ),
      );
  }),
);

export const replicacheGroupLayer = baseReplicacheGroupLayer.pipe(
  Layer.provide([Puller.layer, Pusher.layer]),
  Layer.provide(Syncer.layer),
  Layer.provide([
    AnnouncementsSync.layer,
    CommentsSync.layer,
    DeliveryOptionsSync.layer,
    CustomerGroupsSync.layer,
    CustomerGroupMembershipsSync.layer,
    InvoicesSync.layer,
    OrdersSync.layer,
    ProductsSync.layer,
    RoomsSync.layer,
    SharedAccountsSync.layer,
    SharedAccountCustomerAccessSync.layer,
    SharedAccountCustomerGroupAccessSync.layer,
    SharedAccountManagerAccessSync.layer,
    TenantsSync.layer,
    UsersSync.layer,
    RoomWorkflowsSync.layer,
    SharedAccountWorkflowsSync.layer,
    WorkflowStatusesSync.layer,
  ]),
  Layer.provide(MutationsDispatcher.layer),
  Layer.provide([
    AnnouncementsMutations.layer,
    CommentsMutations.layer,
    DeliveryOptionsMutations.layer,
    InvoicesMutations.layer,
    OrdersMutations.layer,
    ProductsMutations.layer,
    RoomsMutations.layer,
    SharedAccountsMutations.layer,
    SharedAccountManagerAccessMutations.layer,
    TenantsMutations.layer,
    UsersMutations.layer,
    WorkflowStatusesMutations.layer,
  ]),
  Layer.provide([
    AnnouncementsPolicies.layer,
    CommentsPolicies.layer,
    DeliveryOptionsPolicies.layer,
    OrdersPolicies.layer,
    ProductsPolicies.layer,
    RoomsPolicies.layer,
    SharedAccountsPolicies.layer,
    SharedAccountManagerAccessPolicies.layer,
    UsersPolicies.layer,
    WorkflowStatusesPolicies.layer,
  ]),
  Layer.provide([SharedAccountWorkflowsPolicies.layer, ReplicacheNotifier.layer]),
  Layer.provide(realtimeLayer),
  Layer.provide([
    AnnouncementsRepository.layer,
    CommentsRepository.layer,
    DeliveryOptionsRepository.layer,
    CustomerGroupsRepository.layer,
    CustomerGroupMembershipsRepository.layer,
    InvoicesRepository.layer,
    OrdersRepository.layer.pipe(Layer.provide(OrdersShortIdGenerator.layer)),
    ProductsRepository.layer,
    RoomsRepository.layer,
    SharedAccountsRepository.layer,
    SharedAccountCustomerAccessRepository.layer,
    SharedAccountCustomerGroupAccessRepository.layer,
    SharedAccountManagerAccessRepository.layer,
    TenantsRepository.layer,
    UsersRepository.layer,
    RoomWorkflowsRepository.layer,
    SharedAccountWorkflowsRepository.layer,
    WorkflowStatusesRepository.layer,
    ReplicacheClientGroupsRepository.layer,
    ReplicacheClientsRepository.layer,
    ReplicacheClientViewsRepository.layer,
    ReplicacheClientViewEntriesRepository.layer,
  ]),
  Layer.provide(SyncQueryBuilder.layer),
  Layer.provide([databaseLayer, dynamoLayer, realtimePublisherAwsCredentialIdentityLayer]),
  Layer.provide(SstResource.layer),
);
