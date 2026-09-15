import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { OrderObjectMetadataMutations } from ".";
import { AccessControl } from "../../../../access-control";
import { Mutation } from "../../../../mutations";
import { ProductsRepository } from "../../../../products/client/repository";
import { OrderObjectMetadataContract } from "../../../contracts";
import { OrdersPolicies } from "../../policies";
import { OrderObjectMetadataPolicies } from "../policies";
import { OrderObjectMetadataRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* OrderObjectMetadataRepository;
  const productsRepository = yield* ProductsRepository;

  const policies = yield* OrderObjectMetadataPolicies;
  const ordersPolicies = yield* OrdersPolicies;

  const create = Mutation.make(OrderObjectMetadataContract.create, {
    makePolicy: (object) => ordersPolicies.canEdit.make({ id: object.orderId }),
    mutator: (object, { tenantId }) =>
      OrderObjectMetadataContract.Table.Dto.makeEffect({ ...object, tenantId }).pipe(
        Effect.tap((object) =>
          productsRepository.findByOrderId(object.orderId).pipe(
            Effect.filterOrFail(
              (product) => product.config.isValidOrderAttachment(object),
              () => new Cause.IllegalArgumentError(),
            ),
          ),
        ),
        Effect.flatMap(repository.create),
      ),
  });

  const transitionStatus = Mutation.make(OrderObjectMetadataContract.transitionStatus, {
    makePolicy: ({ id }) => policies.canEdit.make({ id }),
    mutator: ({ id, status }) => repository.updateById(id, () => Effect.succeed({ status })),
  });

  const delete_ = Mutation.make(OrderObjectMetadataContract.delete_, {
    makePolicy: ({ id }) => policies.canDelete.make({ id }),
    mutator: ({ id, deletedAt }) =>
      repository
        .updateById(id, () => Effect.succeed({ deletedAt }))
        .pipe(
          AccessControl.enforce(AccessControl.userPermissionPolicy("order_object_metadata:read")),
          Effect.catchTag("AccessDeniedError", () => repository.deleteById(id)),
        ),
  });

  return {
    create,
    transitionStatus,
    delete: delete_,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(OrderObjectMetadataMutations));
