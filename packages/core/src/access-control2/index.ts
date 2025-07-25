import { Array, Context, Data, Effect, Schema, Struct } from "effect";

import * as schema from "../database2/schema";

import type { NonEmptyReadonlyArray } from "effect/Array";
import type { ReadonlyRecord } from "effect/Record";
import type { Tenant } from "../tenants2/sql";
import type { UserRole } from "../users2/shared";
import type { User } from "../users2/sql";

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

  const syncTablePermissions = Object.values(schema)
    .filter((data) => data._tag === "@printdesk/core/database/SyncTable")
    .flatMap(({ permissions }) => permissions);

  const nonSyncTablePermissions = Object.values(schema)
    .filter((data) => data._tag === "@printdesk/core/database/NonSyncTable")
    .flatMap(({ permissions }) => permissions);

  const viewPermissions = Object.values(schema)
    .filter((data) => data._tag === "@printdesk/core/database/View")
    .flatMap(({ permission }) => permission);

  const externalPermissions = makePermissionsFromConfig({
    document_constraints: ["read", "update"],
    papercut_sync: ["create", "read"],
    // NOTE: proxy structure: protocol (https/http), fqdn (*.tailnet-*.ts.net), port, path (other than root /)
    papercut_tailscale_proxy: ["read", "update"],
    tailscale_oauth_client: ["update"],
  } as const);

  export const Permission = Schema.Literal(
    ...syncTablePermissions,
    ...nonSyncTablePermissions,
    ...viewPermissions,
    ...externalPermissions,
  );
  export type Permission = Schema.Schema.Type<typeof Permission>;

  export type UserRoleAcls = ReadonlyRecord<
    UserRole,
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
      "workflow_statuses:create",
      "workflow_statuses:read",
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
      "document_constraints:read",
      "document_constraints:update",
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
      "workflow_statuses:create",
      "workflow_statuses:read",
    ] as const,
    manager: [
      "active_announcements:read",
      "active_billing_accounts:read",
      "active_billing_account_customer_authorizations:read",
      "active_billing_account_manager_authorizations:read",
      "active_published_room_delivery_options:read",
      "document_constraints:read",
      "active_published_products:read",
      "active_published_rooms:read",
      "tenants:read",
      "active_users:read",
      "active_published_room_workflow_statuses:read",
    ] as const,
    customer: [
      "active_announcements:read",
      "active_published_room_delivery_options:read",
      "document_constraints:read",
      "active_published_products:read",
      "active_published_rooms:read",
      "tenants:read",
      "active_users:read",
      "active_published_room_workflow_statuses:read",
    ] as const,
  } satisfies UserRoleAcls;

  export type PrincipalShape = {
    readonly userId: User["id"];
    readonly tenantId: Tenant["id"];
    readonly acl: ReadonlySet<Permission>;
  };

  export class Principal extends Context.Tag(
    "@printdesk/core/access-control/Principal",
  )<Principal, PrincipalShape>() {}

  export class AccessDeniedError extends Data.TaggedError(
    "AccessDeniedError",
  ) {}

  export type Policy<TError = never, TRequirements = never> = Effect.Effect<
    void,
    AccessDeniedError | TError,
    Principal | TRequirements
  >;

  export const enforce =
    <TPolicyError, TPolicyRequirements>(
      policy: Policy<TPolicyError, TPolicyRequirements>,
    ) =>
    <TSuccess, TError, TRequirements>(
      self: Effect.Effect<TSuccess, TError, TRequirements>,
    ) =>
      Effect.zipRight(policy, self);

  export const some = <TError, TRequirements>(
    ...policies: NonEmptyReadonlyArray<Policy<TError, TRequirements>>
  ): Policy<TError, TRequirements> => Effect.firstSuccessOf(policies);

  export const every = <TError, TRequirements>(
    ...policies: NonEmptyReadonlyArray<Policy<TError, TRequirements>>
  ): Policy<TError, TRequirements> =>
    Effect.all(policies, { concurrency: 1, discard: true });

  export const policy = <TError, TRequirements>(
    predicate: (
      principal: Principal["Type"],
    ) => Effect.Effect<boolean, TError, TRequirements>,
  ): Policy<TError, TRequirements> =>
    Effect.gen(function* () {
      const principal = yield* Principal;

      const access = yield* predicate(principal);
      if (!access) yield* Effect.fail(new AccessDeniedError());
    });

  export const permission = (permission: Permission) =>
    policy((principal) => Effect.succeed(principal.acl.has(permission)));
}
