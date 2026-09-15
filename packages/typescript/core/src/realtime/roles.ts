import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { Actor } from "../actors";
import { AppsyncPublisherRole, AppsyncSubscriberRole } from "../aws/appsync/roles";
import { SstResource } from "../sst/resource";
import { tenantTemplate } from "../utils";

export const makeAppsyncPublisherRole = Effect.gen(function* () {
  const roleTemplate = yield* SstResource.useSync(
    Struct.get("AppsyncChannelNamespacePublisherRoleTemplate"),
  ).pipe(Effect.map(Redacted.value));

  const arn = Actor.tenantId.pipe(Effect.map(tenantTemplate(roleTemplate.arn)));
  const name = Actor.tenantId.pipe(Effect.map(tenantTemplate(roleTemplate.name)));

  return {
    arn,
    name,
  } as const;
});

export const appsyncPublisherRoleLayer = makeAppsyncPublisherRole.pipe(
  Layer.effect(AppsyncPublisherRole),
);

export const makeAppsyncSubscriberRole = Effect.gen(function* () {
  const roleTemplate = yield* SstResource.useSync(
    Struct.get("AppsyncChannelNamespaceSubscriberRoleTemplate"),
  ).pipe(Effect.map(Redacted.value));

  const arn = Actor.tenantId.pipe(Effect.map(tenantTemplate(roleTemplate.arn)));
  const name = Actor.tenantId.pipe(Effect.map(tenantTemplate(roleTemplate.name)));

  return {
    arn,
    name,
  } as const;
});

export const appsyncSubscriberRoleLayer = makeAppsyncSubscriberRole.pipe(
  Layer.effect(AppsyncSubscriberRole),
);
