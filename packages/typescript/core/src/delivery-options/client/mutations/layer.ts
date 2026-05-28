import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { DeliveryOptionsMutations } from ".";
import { AccessControl } from "../../../access-control";
import { MutationsContract } from "../../../mutations/contract";
import { DeliveryOptionsContract } from "../../contract";
import { DeliveryOptionsPolicies } from "../policies";
import { DeliveryOptionsWriteRepository } from "../write-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* DeliveryOptionsWriteRepository;

  const policies = yield* DeliveryOptionsPolicies;

  const create = MutationsContract.makeMutation(DeliveryOptionsContract.create, {
    makePolicy: () => AccessControl.userPermissionPolicy("delivery_options:create"),
    mutator: (deliveryOption, { tenantId }) =>
      DeliveryOptionsContract.Table.Dto.makeEffect({ ...deliveryOption, tenantId }).pipe(
        Effect.flatMap(repository.create),
      ),
  });

  const edit = MutationsContract.makeMutation(DeliveryOptionsContract.edit, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("delivery_options:update"),
        policies.canEdit.make({ id }),
      ),
    mutator: ({ id, ...deliveryOption }) =>
      repository.updateById(id, () => Effect.succeed(deliveryOption)),
  });

  const delete_ = MutationsContract.makeMutation(DeliveryOptionsContract.delete_, {
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

  const restore = MutationsContract.makeMutation(DeliveryOptionsContract.restore, {
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
