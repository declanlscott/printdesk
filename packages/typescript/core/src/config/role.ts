import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { Actor } from "../actors";
import { AppconfigRole } from "../aws/appconfig/role";
import { SstResource } from "../sst/resource";
import { tenantTemplate } from "../utils";

export const makeAppconfigRole = Effect.gen(function* () {
  const roleTemplate = yield* SstResource.useSync(Struct.get("AppconfigRoleTemplate")).pipe(
    Effect.map(Redacted.value),
  );

  const arn = Actor.tenantId.pipe(Effect.map(tenantTemplate(roleTemplate.arn)));
  const name = Actor.tenantId.pipe(Effect.map(tenantTemplate(roleTemplate.name)));

  return {
    arn,
    name,
  } as const;
});

export const appconfigRoleLayer = makeAppconfigRole.pipe(Layer.effect(AppconfigRole));
