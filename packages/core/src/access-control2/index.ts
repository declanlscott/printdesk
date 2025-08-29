import { Array, Context, Data, Effect, Option, Schema, Struct } from "effect";

import { nonSyncTables, syncTables } from "../database2/tables";
import { views } from "../database2/views";

import type { NonEmptyReadonlyArray } from "effect/Array";
import type { ReadonlyRecord } from "effect/Record";
import type { TableContract } from "../database2/contract";
import type { UsersContract } from "../users2/contract";

export namespace AccessControl {
  export type PermissionAction = "create" | "read" | "update" | "delete";

  export type PermissionsConfig = Record<
    string,
    ReadonlyArray<PermissionAction>
  >;

  export type InferPermissionsFromConfig<TConfig extends PermissionsConfig> = {
    [TResource in keyof TConfig]: TConfig[TResource][number] extends PermissionAction
      ? `${TResource & string}:${TConfig[TResource][number]}`
      : never;
  }[keyof TConfig];

  const makePermissionsFromConfig = <TConfig extends PermissionsConfig>(
    config: TConfig,
  ) =>
    Array.flatMap(Struct.entries(config), ([resource, actions]) =>
      Array.map(
        actions,
        (action) =>
          `${resource}:${action}` as InferPermissionsFromConfig<TConfig>,
      ),
    );

  const syncTablePermissions = syncTables.flatMap(
    ({ permissions }) => permissions,
  );

  const nonSyncTablePermissions = nonSyncTables.flatMap(
    ({ permissions }) => permissions,
  );

  const viewPermissions = views.flatMap(({ permission }) => permission);

  const externalPermissions = makePermissionsFromConfig({
    document_constraints: ["read", "update"],
    papercut_sync: ["create", "read"],
    // NOTE: proxy structure: protocol (https/http), fqdn (*.tailnet-*.ts.net), port, path (other than root /)
    papercut_tailscale_proxy: ["read", "update"],
    tailscale_oauth_client: ["update"],
  } as const);

  export const permissions = [
    ...syncTablePermissions,
    ...nonSyncTablePermissions,
    ...viewPermissions,
    ...externalPermissions,
  ] as const;
  export type Permissions = typeof permissions;

  export const Permission = Schema.Literal(...permissions);
  export type Permission = typeof Permission.Type;

  export const readPermissions = Array.filterMap(permissions, (permission) =>
    permission.endsWith(":read")
      ? Option.some(
          permission as {
            [TPermission in Permissions[number]]: TPermission extends `${string}:read`
              ? TPermission
              : never;
          }[Permissions[number]],
        )
      : Option.none(),
  );
  export type ReadPermissions = typeof readPermissions;

  export const ReadPermission = Schema.Literal(...readPermissions);
  export type ReadPermission = typeof ReadPermission.Type;

  export type UserRoleAcls = ReadonlyRecord<
    UsersContract.Role,
    ReadonlyArray<Permission>
  >;
  export const userRoleAcls = {
    administrator: [
      "announcements:create",
      "announcements:read",
      "announcements:update",
      "announcements:delete",
      "billing_accounts:read",
      "billing_accounts:update",
      "billing_accounts:delete",
      "billing_account_customer_authorizations:read",
      "billing_account_manager_authorizations:create",
      "billing_account_manager_authorizations:read",
      "billing_account_manager_authorizations:delete",
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
      "billing_account_workflows:read",
      "room_workflows:read",
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
      "active_billing_accounts:read",
      "billing_accounts:update",
      "active_billing_account_customer_authorizations:read",
      "active_billing_account_manager_authorizations:read",
      "comments:create",
      "active_comments:read",
      "delivery_options:create",
      "delivery_options:read",
      "delivery_options:update",
      "delivery_options:delete",
      "document_constraints:read",
      "document_constraints:update",
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
      "billing_account_workflows:read",
      "room_workflows:read",
      "workflow_statuses:create",
      "workflow_statuses:read",
      "workflow_statuses:update",
      "workflow_statuses:delete",
    ] as const,
    manager: [
      "active_announcements:read",
      "active_manager_authorized_billing_accounts:read",
      "active_customer_authorized_billing_accounts:read",
      "active_authorized_billing_account_customer_authorizations:read",
      "active_authorized_billing_account_manager_authorizations:read",
      "active_customer_authorized_billing_account_manager_authorizations:read",
      "active_managed_billing_account_order_comments:read",
      "active_placed_order_comments:read",
      "active_published_room_delivery_options:read",
      "document_constraints:read",
      "active_managed_billing_account_order_invoices:read",
      "active_placed_order_invoices:read",
      "active_managed_billing_account_orders:read",
      "active_placed_orders:read",
      "active_published_products:read",
      "active_published_rooms:read",
      "tenants:read",
      "active_users:read",
      "active_customer_authorized_billing_account_workflows:read",
      "active_manager_authorized_billing_account_workflows:read",
      "active_published_room_workflows:read",
    ] as const,
    customer: [
      "active_announcements:read",
      "active_customer_authorized_billing_accounts:read",
      "active_authorized_billing_account_customer_authorizations:read",
      "active_customer_authorized_billing_account_manager_authorizations:read",
      "active_placed_order_comments:read",
      "active_published_room_delivery_options:read",
      "document_constraints:read",
      "active_placed_order_invoices:read",
      "active_placed_orders:read",
      "active_published_products:read",
      "active_published_rooms:read",
      "tenants:read",
      "active_users:read",
      "active_customer_authorized_billing_account_workflows:read",
      "active_published_room_workflows:read",
    ] as const,
  } satisfies UserRoleAcls;

  export type PrincipalShape = {
    readonly userId: TableContract.EntityId;
    readonly tenantId: TableContract.TenantId;
    readonly acl: ReadonlySet<Permission>;
  };

  export class Principal extends Context.Tag(
    "@printdesk/core/access-control/Principal",
  )<Principal, PrincipalShape>() {}

  export class AccessDeniedError extends Data.TaggedError("AccessDeniedError")<{
    readonly message: string;
  }> {}

  export type MakePolicy<
    TArgs extends Schema.Schema.AnyNoContext,
    TError,
    TContext,
  > = (
    args: Schema.Schema.Type<TArgs>,
  ) => AccessControl.Policy<TError, TContext>;

  export type Policy<TError = never, TContext = never> = Effect.Effect<
    void,
    AccessDeniedError | TError,
    Principal | TContext
  >;

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
    message = "Access denied",
  ): Policy<TError, TContext> =>
    Effect.gen(function* () {
      const principal = yield* Principal;

      const access = yield* predicate(principal);
      if (!access)
        return yield* Effect.fail(new AccessDeniedError({ message }));
    });

  export const permission = (permission: Permission) =>
    policy((principal) => Effect.succeed(principal.acl.has(permission)));
}
