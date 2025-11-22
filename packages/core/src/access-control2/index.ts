import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as HashSet from "effect/HashSet";

import type { Schema } from "effect";
import type { NonEmptyReadonlyArray } from "effect/Array";
import type { ReadonlyRecord } from "effect/Record";
import type { ColumnsContract } from "../columns2/contract";
import type { Permissions } from "../permissions2";
import type { UsersContract } from "../users2/contract";

export namespace AccessControl {
  export type UserRoleAcls = ReadonlyRecord<
    UsersContract.Role,
    ReadonlyArray<Permissions.Permission>
  >;
  export const userRoleAcls = {
    administrator: [
      "announcements:create",
      "announcements:read",
      "announcements:update",
      "announcements:delete",
      "shared_accounts:read",
      "shared_accounts:update",
      "shared_accounts:delete",
      "shared_account_customer_access:read",
      "shared_account_manager_access:create",
      "shared_account_manager_access:read",
      "shared_account_manager_access:delete",
      "comments:create",
      "comments:read",
      "comments:update",
      "comments:delete",
      "delivery_options:create",
      "delivery_options:read",
      "delivery_options:update",
      "delivery_options:delete",
      "document_constraints:read",
      "document_constraints:update",
      "groups:read",
      "invoices:create",
      "invoices:read",
      "identity_providers:create",
      "identity_providers:read",
      "identity_providers:delete",
      "orders:create",
      "orders:read",
      "orders:update",
      "orders:delete",
      "papercut_sync:create",
      "papercut_sync:read",
      "products:create",
      "products:read",
      "products:update",
      "products:delete",
      "rooms:create",
      "rooms:update",
      "rooms:read",
      "rooms:delete",
      "tailscale_oauth_client:update",
      "tenants:read",
      "tenants:update",
      "users:read",
      "users:update",
      "users:delete",
      "room_workflows:read",
      "shared_account_workflows:read",
      "workflow_statuses:create",
      "workflow_statuses:read",
      "workflow_statuses:update",
      "workflow_statuses:delete",
    ] as const,
    operator: [
      "announcements:create",
      "active_announcements:read",
      "announcements:update",
      "announcements:delete",
      "active_shared_accounts:read",
      "shared_accounts:update",
      "active_shared_account_customer_access:read",
      "active_shared_account_manager_access:read",
      "comments:create",
      "active_comments:read",
      "delivery_options:create",
      "active_delivery_options:read",
      "delivery_options:update",
      "delivery_options:delete",
      "document_constraints:read",
      "document_constraints:update",
      "active_groups:read",
      "active_invoices:read",
      "orders:create",
      "active_orders:read",
      "orders:update",
      "orders:delete",
      "products:create",
      "active_products:read",
      "products:update",
      "products:delete",
      "active_rooms:read",
      "rooms:update",
      "tenants:read",
      "active_users:read",
      "active_room_workflows:read",
      "active_shared_account_workflows:read",
      "active_workflow_statuses:read",
    ] as const,
    manager: [
      "active_published_room_announcements:read",
      "active_manager_authorized_shared_accounts:read",
      "active_customer_authorized_shared_accounts:read",
      "active_authorized_shared_account_customer_access:read",
      "active_authorized_shared_account_manager_access:read",
      "active_customer_authorized_shared_account_manager_access:read",
      "active_customer_placed_order_comments:read",
      "active_manager_authorized_shared_account_order_comments:read",
      "active_published_room_delivery_options:read",
      "document_constraints:read",
      "active_groups:read",
      "active_customer_placed_order_invoices:read",
      "active_manager_authorized_shared_account_order_invoices:read",
      "active_customer_placed_orders:read",
      "active_manager_authorized_shared_account_orders:read",
      "active_published_products:read",
      "active_published_rooms:read",
      "tenants:read",
      "active_users:read",
      "active_published_room_workflows:read",
      "active_customer_authorized_shared_account_workflows:read",
      "active_manager_authorized_shared_account_workflows:read",
      "active_published_room_workflow_statuses:read",
      "active_customer_authorized_shared_account_workflow_statuses:read",
      "active_manager_authorized_shared_account_workflow_statuses:read",
    ] as const,
    customer: [
      "active_published_room_announcements:read",
      "active_customer_authorized_shared_accounts:read",
      "active_authorized_shared_account_customer_access:read",
      "active_customer_authorized_shared_account_manager_access:read",
      "active_customer_placed_order_comments:read",
      "active_published_room_delivery_options:read",
      "document_constraints:read",
      "active_groups:read",
      "active_customer_placed_order_invoices:read",
      "active_customer_placed_orders:read",
      "active_published_products:read",
      "active_published_rooms:read",
      "tenants:read",
      "active_users:read",
      "active_published_room_workflows:read",
      "active_customer_authorized_shared_account_workflows:read",
      "active_published_room_workflow_statuses:read",
      "active_customer_authorized_shared_account_workflow_statuses:read",
    ] as const,
  } satisfies UserRoleAcls;

  export class Principal extends Effect.Tag(
    "@printdesk/core/access-control/Principal",
  )<
    Principal,
    {
      readonly userId: ColumnsContract.EntityId;
      readonly tenantId: ColumnsContract.TenantId;
      readonly acl: HashSet.HashSet<Permissions.Permission>;
    }
  >() {}

  export class AccessDeniedError extends Data.TaggedError("AccessDeniedError")<{
    readonly message: string;
  }> {}

  export type Policy<TError = never, TContext = never> = Effect.Effect<
    void,
    AccessDeniedError | TError,
    Principal | TContext
  >;

  export type MakePolicy<
    TArgs extends Schema.Schema.AnyNoContext,
    TError,
    TContext,
  > = (
    args: Schema.Schema.Type<TArgs>,
  ) => Policy<Exclude<TError, AccessDeniedError>, Exclude<TContext, Principal>>;

  export const enforce =
    <TPolicyError, TPolicyContext>(
      policy: Policy<TPolicyError, TPolicyContext>,
    ) =>
    <TSuccess, TError, TContext>(
      self: Effect.Effect<TSuccess, TError, TContext>,
    ) =>
      Effect.zipRight(policy, self);

  export const some = <TError, TContext>(
    ...policies: NonEmptyReadonlyArray<Policy<TError, TContext>>
  ): Policy<TError, TContext> => Effect.firstSuccessOf(policies);

  export const every = <TError, TContext>(
    ...policies: NonEmptyReadonlyArray<Policy<TError, TContext>>
  ): Policy<TError, TContext> =>
    Effect.all(policies, { concurrency: 1, discard: true });

  export const policy = <TError, TContext>(
    predicate: (
      principal: Principal["Type"],
    ) => Effect.Effect<boolean, TError, TContext>,
    message = "Access denied.",
  ): Policy<TError, TContext> =>
    Effect.gen(function* () {
      const principal = yield* Principal;

      const access = yield* predicate(principal);
      if (!access)
        return yield* Effect.fail(new AccessDeniedError({ message }));
    });

  export const permission = (permission: Permissions.Permission) =>
    policy(
      (principal) =>
        principal.acl.pipe(HashSet.has(permission), Effect.succeed),
      `Access denied: ${permission}`,
    );
}
