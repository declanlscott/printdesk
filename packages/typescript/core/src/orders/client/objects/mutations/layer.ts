import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { OrderObjectsMutations } from ".";
import { AccessControl } from "../../../../access-control";
import { Mutation } from "../../../../mutations";
import { OrderObjectsContract } from "../../../contracts";
import { OrdersPolicies } from "../../policies";
import { OrderObjectsPolicies } from "../policies";
import { OrderObjectsRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* OrderObjectsRepository;

  const policies = yield* OrderObjectsPolicies;
  const ordersPolicies = yield* OrdersPolicies;

  const create = Mutation.make(OrderObjectsContract.create, {
    makePolicy: (object) => ordersPolicies.canEdit.make({ id: object.orderId }),
    mutator: (object, { tenantId }) =>
      OrderObjectsContract.Table.Dto.makeEffect({ ...object, tenantId }).pipe(
        Effect.flatMap(repository.create),
      ),
  });

  const transitionStatus = Mutation.make(OrderObjectsContract.transitionStatus, {
    makePolicy: ({ id }) => policies.canEdit.make({ id }),
    mutator: ({ id, status }) => repository.updateById(id, () => Effect.succeed({ status })),
  });

  const delete_ = Mutation.make(OrderObjectsContract.delete_, {
    makePolicy: ({ id }) => policies.canDelete.make({ id }),
    mutator: ({ id, deletedAt }) =>
      repository
        .updateById(id, () => Effect.succeed({ deletedAt }))
        .pipe(
          AccessControl.enforce(AccessControl.userPermissionPolicy("order_objects:read")),
          Effect.catchTag("AccessDeniedError", () => repository.deleteById(id)),
        ),
  });

  return {
    create,
    transitionStatus,
    delete: delete_,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(OrderObjectsMutations));
