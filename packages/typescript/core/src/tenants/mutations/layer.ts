import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { TenantsMutations } from ".";
import { AccessControl } from "../../access-control";
import { MutationsContract } from "../../mutations/contract";
import { ReplicacheContract } from "../../replicache/contracts";
import { ReplicacheNotifier } from "../../replicache/notifier";
import { TenantsContract } from "../contract";
import { TenantsRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* TenantsRepository;

  const notifier = yield* ReplicacheNotifier;

  const notify = () =>
    notifier.notify(
      Array.make(ReplicacheContract.PullPermission.make({ permission: "tenants:read" })),
    );

  const edit = MutationsContract.makeMutation(TenantsContract.edit, {
    makePolicy: Effect.fn("Tenants.Mutations.edit.makePolicy")(() =>
      AccessControl.userPermissionPolicy("tenants:update"),
    ),
    mutator: Effect.fn("Tenants.Mutations.edit.mutator")((tenant, user) =>
      repository.updateById(user.tenantId, tenant).pipe(Effect.tap(notify)),
    ),
  });

  return { edit } as const;
});

export const layer = makeService.pipe(Layer.effect(TenantsMutations));
