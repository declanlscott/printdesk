import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Struct from "effect/Struct";

import { OrderObjectMetadataPolicies } from ".";
import { AccessControl } from "../../../../access-control";
import { Policy } from "../../../../policies";
import { OrderObjectMetadataContract } from "../../../contracts";
import { OrdersPolicies } from "../../policies";
import { OrderObjectMetadataRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* OrderObjectMetadataRepository;

  const ordersPolicies = yield* OrdersPolicies;

  const canEdit = Policy.make(OrderObjectMetadataContract.canEdit, {
    make: ({ id }) =>
      AccessControl.userPolicy(
        () =>
          repository.findById(id).pipe(
            Effect.map(Struct.get("orderId")),
            Effect.flatMap((id) => ordersPolicies.canEdit.make({ id })),
            Effect.as(true),
            Effect.catchTag("AccessDeniedError", () => Effect.succeed(false)),
          ),
        { name: OrderObjectMetadataContract.Table.name, id },
      ),
  });

  const canDelete = Policy.make(OrderObjectMetadataContract.canDelete, {
    make: canEdit.make,
  });

  return {
    canEdit,
    canDelete,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(OrderObjectMetadataPolicies));
