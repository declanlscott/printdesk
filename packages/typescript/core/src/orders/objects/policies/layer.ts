import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Struct from "effect/Struct";

import { OrderObjectsPolicies } from ".";
import { AccessControl } from "../../../access-control";
import { Policy } from "../../../policies";
import { OrderObjectsContract } from "../../contracts";
import { OrdersPolicies } from "../../policies";
import { OrderObjectsRepository } from "../repositories";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* OrderObjectsRepository;

  const ordersPolicies = yield* OrdersPolicies;

  const canEdit = Policy.make(OrderObjectsContract.canEdit, {
    make: Effect.fn("OrderObjects.Policies.canEdit.make")(({ id }) =>
      AccessControl.userPolicy(
        ({ tenantId }) =>
          repository.findById(id, tenantId).pipe(
            Effect.map(Struct.get("orderId")),
            Effect.flatMap((id) => ordersPolicies.canEdit.make({ id })),
            Effect.as(true),
            Effect.catchTag("AccessDeniedError", () => Effect.succeed(false)),
          ),
        { name: OrderObjectsContract.Table.name, id },
      ),
    ),
  });

  const canDelete = Policy.make(OrderObjectsContract.canDelete, {
    make: Effect.fn("OrderObjects.Policies.canDelete.make")(canEdit.make),
  });

  return {
    canEdit,
    canDelete,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(OrderObjectsPolicies));
