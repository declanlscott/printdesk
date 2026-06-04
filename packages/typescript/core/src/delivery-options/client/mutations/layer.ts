import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { DeliveryOptionsMutations } from ".";
import { AccessControl } from "../../../access-control";
import { Mutation } from "../../../mutations";
import { DeliveryOptionsContract } from "../../contract";
import { DeliveryOptionsPolicies } from "../policies";
import { DeliveryOptionsWriteRepository } from "../write-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* DeliveryOptionsWriteRepository;

  const policies = yield* DeliveryOptionsPolicies;

  const create = Mutation.make(DeliveryOptionsContract.create, {
    makePolicy: () => AccessControl.userPermissionPolicy("delivery_options:create"),
    mutator: (deliveryOption, { tenantId }) =>
      DeliveryOptionsContract.Table.Dto.makeEffect({ ...deliveryOption, tenantId }).pipe(
        Effect.flatMap(repository.create),
      ),
  });

  const edit = Mutation.make(DeliveryOptionsContract.edit, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("delivery_options:update"),
        policies.canEdit.make({ id }),
      ),
    mutator: ({ id, ...deliveryOption }) =>
      repository.updateById(id, () => Effect.succeed(deliveryOption)),
  });

  const delete_ = Mutation.make(DeliveryOptionsContract.delete_, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("delivery_options:delete"),
        policies.canDelete.make({ id }),
      ),
    mutator: ({ id, deletedAt }) =>
      repository
        .updateById(id, () => Effect.succeed({ deletedAt }))
        .pipe(
          AccessControl.enforce(AccessControl.userPermissionPolicy("delivery_options:read")),
          Effect.catchTag("AccessDeniedError", () => repository.deleteById(id)),
        ),
  });

  const restore = Mutation.make(DeliveryOptionsContract.restore, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("delivery_options:delete"),
        policies.canRestore.make({ id }),
      ),
    mutator: ({ id }) =>
      repository
        .updateById(id, () => Effect.succeed({ deletedAt: null }))
        .pipe(AccessControl.enforce(AccessControl.userPermissionPolicy("delivery_options:read"))),
  });

  return { create, edit, delete: delete_, restore } as const;
});

export const layer = makeService.pipe(Layer.effect(DeliveryOptionsMutations));
