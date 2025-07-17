import { Context, Data, Effect, Schema } from "effect";

import * as schema from "../database2/schema";
import { makePermissionsFromConfig } from "./shared";

import type { NonEmptyReadonlyArray } from "effect/Array";

export namespace AccessControl {
  const tablePermissions = Object.values(schema).flatMap(
    ({ permissions }) => permissions,
  );

  const externalPermissions = makePermissionsFromConfig({
    "document-constraints": ["read", "update"],
    "papercut-sync": ["create", "read"],
    // NOTE: proxy structure: protocol (https/http), fqdn (*.tailnet-*.ts.net), port, path (other than root /)
    "papercut-tailscale-proxy": ["read", "update"],
    "tailscale-oauth-client": ["update"],
  } as const);

  export const Permission = Schema.Literal(
    ...tablePermissions,
    ...externalPermissions,
  );
  export type Permission = Schema.Schema.Type<typeof Permission>;

  export type PrincipalShape = {
    readonly userId: schema.User["id"];
    readonly tenantId: schema.Tenant["id"];
    readonly acl: Set<Permission>;
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
