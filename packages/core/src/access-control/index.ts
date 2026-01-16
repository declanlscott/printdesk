import { HttpApiSchema } from "@effect/platform";
import * as Effect from "effect/Effect";
import * as HashSet from "effect/HashSet";
import * as Match from "effect/Match";
import * as Schema from "effect/Schema";
import * as SchemaAST from "effect/SchemaAST";
import * as Struct from "effect/Struct";

import { Actors } from "../actors";
import { ActorsContract } from "../actors/contract";
import { Permissions } from "../permissions";

import type { NonEmptyReadonlyArray } from "effect/Array";
import type { ReadonlyRecord } from "effect/Record";
import type { UsersContract } from "../users/contract";

export namespace AccessControl {
  export type UserRoleAcl = ReadonlyRecord<
    UsersContract.Role,
    HashSet.HashSet<Permissions.EncodedPermission>
  >;

  export const userRoleAcls = Effect.sync(
    () =>
      ({
        administrator: HashSet.make<
          ReadonlyArray<Permissions.EncodedPermission>
        >(
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
          "shared_account_customer_group_access:read",
          "comments:create",
          "comments:read",
          "comments:update",
          "comments:delete",
          "customer_groups:read",
          "customer_group_memberships:read",
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
          "room_workflows:read",
          "shared_account_workflows:read",
          "workflow_statuses:create",
          "workflow_statuses:read",
          "workflow_statuses:update",
          "workflow_statuses:delete",
        ),
        operator: HashSet.make<ReadonlyArray<Permissions.EncodedPermission>>(
          "announcements:create",
          "active_announcements:read",
          "announcements:update",
          "announcements:delete",
          "active_shared_accounts:read",
          "shared_accounts:update",
          "active_shared_account_customer_access:read",
          "active_shared_account_manager_access:read",
          "active_shared_account_customer_group_access:read",
          "comments:create",
          "active_comments:read",
          "active_customer_groups:read",
          "active_customer_group_memberships:read",
          "delivery_options:create",
          "active_delivery_options:read",
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
          "active_room_workflows:read",
          "active_shared_account_workflows:read",
          "active_workflow_statuses:read",
        ),
        manager: HashSet.make<ReadonlyArray<Permissions.EncodedPermission>>(
          "active_published_room_announcements:read",
          "active_manager_authorized_shared_accounts:read",
          "active_customer_authorized_shared_accounts:read",
          "active_authorized_shared_account_customer_access:read",
          "active_authorized_shared_account_manager_access:read",
          "active_customer_authorized_shared_account_manager_access:read",
          "active_authorized_shared_account_customer_group_access:read",
          "active_customer_placed_order_comments:read",
          "active_manager_authorized_shared_account_order_comments:read",
          "active_customer_groups:read",
          "active_published_room_delivery_options:read",
          "document_constraints:read",
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
        ),
        customer: HashSet.make<ReadonlyArray<Permissions.EncodedPermission>>(
          "active_published_room_announcements:read",
          "active_customer_authorized_shared_accounts:read",
          "active_authorized_shared_account_customer_access:read",
          "active_customer_authorized_shared_account_manager_access:read",
          "active_authorized_shared_account_customer_group_access:read",
          "active_customer_placed_order_comments:read",
          "active_membership_customer_groups:read",
          "active_published_room_delivery_options:read",
          "document_constraints:read",
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
        ),
      }) satisfies UserRoleAcl,
  );

  class EntityString extends Schema.make<Permissions.Resource | (string & {})>(
    SchemaAST.stringKeyword,
  ) {}

  export const Entity = Schema.Union(
    EntityString,
    Schema.Struct({ name: EntityString, id: Schema.String }),
  );
  export type Entity = typeof Entity.Type;

  export class AccessDeniedError extends Schema.TaggedError<AccessDeniedError>(
    "AccessDeniedError",
  )(
    "AccessDeniedError",
    {
      actor: ActorsContract.Actor.fields.properties,
      entity: Entity,
      action: Permissions.Action.pipe(Schema.optional),
    },
    HttpApiSchema.annotations({ status: 403 }),
  ) {
    override get message() {
      const matchAction = Match.type<Permissions.Action | undefined>().pipe(
        Match.when(Match.undefined, () => "access"),
        Match.orElse((action) => `perform action "${action}" on`),
      );

      const matchEntity = Match.type<Entity>().pipe(
        Match.when(Match.string, (entity) => `"${entity}"`),
        Match.orElse(({ name, id }) => `"${name}" (${id})`),
      );

      const matchActor = Match.type<ActorsContract.Actor["properties"]>().pipe(
        Match.tags({
          PublicActor: () =>
            `Public actor is not authorized to ${matchAction(this.action)} entity ${matchEntity(this.entity)}.`,
          SystemActor: (system) =>
            `System actor (${system.tenantId}) is not authorized to ${matchAction(this.action)} entity ${matchEntity(this.entity)}.`,
          UserActor: (user) =>
            `User actor (${user.id}) is not authorized to ${matchAction(this.action)} entity ${matchEntity(this.entity)}.`,
        }),
        Match.exhaustive,
      );

      return matchActor(this.actor);
    }
  }

  export type Policy<TError = never, TContext = never> = Effect.Effect<
    void,
    AccessDeniedError | ActorsContract.InvalidActorError | TError,
    TContext | Actors.Actor
  >;

  export type MakePolicy<
    TArgs extends Schema.Schema.AnyNoContext,
    TError,
    TContext,
  > = (
    args: Schema.Schema.Type<TArgs>,
  ) => Policy<
    Exclude<TError, AccessDeniedError | ActorsContract.InvalidActorError>,
    Exclude<TContext, Actors.Actor>
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

  export const policy =
    (entity: Entity, action?: Permissions.Action) =>
    <TError, TContext>(
      predicate: Effect.Effect<boolean, TError, TContext>,
    ): Policy<TError, TContext> =>
      Effect.gen(function* () {
        const { properties: actor } = yield* Actors.Actor;

        const access = yield* predicate;
        if (!access)
          return yield* new AccessDeniedError({
            actor,
            entity,
            action,
          });
      });

  export const userPolicy = <TError, TContext>(
    entity: Entity,
    predicate: (
      user: ActorsContract.UserActor,
    ) => Effect.Effect<boolean, TError, TContext>,
    action?: Permissions.Action,
  ): Policy<TError, TContext> =>
    Effect.gen(function* () {
      const user = yield* Actors.Actor.pipe(
        Effect.flatMap((actor) => actor.assert("UserActor")),
      );

      const access = yield* predicate(user);
      if (!access)
        return yield* new AccessDeniedError({
          actor: user,
          entity,
          action,
        });
    });

  export const privatePolicy = <TError, TContext>(
    entity: Entity,
    predicate: (
      privateActor: Exclude<
        ActorsContract.Actor["properties"],
        { _tag: "PublicActor" }
      >,
    ) => Effect.Effect<boolean, TError, TContext>,
    action?: Permissions.Action,
  ): Policy<TError, TContext> =>
    Effect.gen(function* () {
      const privateActor = yield* Actors.Actor.pipe(
        Effect.flatMap(Struct.get("assertPrivate")),
      );

      const access = yield* predicate(privateActor);
      if (!access)
        return yield* new AccessDeniedError({
          actor: privateActor,
          entity,
          action,
        });
    });

  export const permission = (permission: Permissions.EncodedPermission) =>
    Permissions.Permission.pipe(
      Effect.map(Schema.decode),
      Effect.flatMap((decode) => decode(permission)),
      Effect.orDie,
      Effect.flatMap(({ resource, action }) =>
        userPolicy(
          resource,
          (user) =>
            userRoleAcls.pipe(
              Effect.map(Struct.get(user.role)),
              Effect.map(HashSet.has(permission)),
            ),
          action,
        ),
      ),
    );
}
