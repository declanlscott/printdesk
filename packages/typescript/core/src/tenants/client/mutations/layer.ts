import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { TenantsMutations } from ".";
import { AccessControl } from "../../../access-control";
import { Mutation } from "../../../mutations";
import { TenantsContract } from "../../contract";
import { TenantsWriteRepository } from "../write-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* TenantsWriteRepository;

  const edit = Mutation.make(TenantsContract.edit, {
    makePolicy: () => AccessControl.userPermissionPolicy("tenants:update"),
    mutator: ({ id, ...tenant }) => repository.updateById(id, () => Effect.succeed(tenant)),
  });

  return { edit } as const;
});

export const layer = makeService.pipe(Layer.effect(TenantsMutations));
