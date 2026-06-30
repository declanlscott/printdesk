import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { DeliveryOptionsPolicies } from ".";
import { AccessControl } from "../../access-control";
import { Policy } from "../../policies";
import { DeliveryOptionsContract } from "../contract";
import { DeliveryOptionsRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* DeliveryOptionsRepository;

  const canEdit = Policy.make(DeliveryOptionsContract.canEdit, {
    make: Effect.fn("DeliveryOptions.Policies.canEdit.make")(({ id }) =>
      AccessControl.userPolicy(
        ({ tenantId }) =>
          repository
            .findById(id, tenantId)
            .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNull)),
        { name: DeliveryOptionsContract.Table.name, id },
      ),
    ),
  });

  const canDelete = Policy.make(DeliveryOptionsContract.canDelete, {
    make: Effect.fn("DeliveryOptions.Policies.canDelete.make")(canEdit.make),
  });

  const canRestore = Policy.make(DeliveryOptionsContract.canRestore, {
    make: Effect.fn("DeliveryOptions.Policies.canRestore.make")(({ id }) =>
      AccessControl.userPolicy(
        ({ tenantId }) =>
          repository
            .findById(id, tenantId)
            .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNotNull)),
        { name: DeliveryOptionsContract.Table.name, id },
      ),
    ),
  });

  return { canEdit, canDelete, canRestore } as const;
});

export const layer = makeService.pipe(Layer.effect(DeliveryOptionsPolicies));
