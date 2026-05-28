import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { DeliveryOptionsPolicies } from ".";
import { AccessControl } from "../../access-control";
import { PoliciesContract } from "../../policies/contract";
import { DeliveryOptionsContract } from "../contract";
import { DeliveryOptionsRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* DeliveryOptionsRepository;

  const canEdit = PoliciesContract.makePolicy(DeliveryOptionsContract.canEdit, {
    make: Effect.fn("DeliveryOptions.Policies.canEdit.make")(({ id }) =>
      AccessControl.userPolicy({ name: DeliveryOptionsContract.Table.name, id }, ({ tenantId }) =>
        repository
          .findById(id, tenantId)
          .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNull)),
      ),
    ),
  });

  const canDelete = PoliciesContract.makePolicy(DeliveryOptionsContract.canDelete, {
    make: Effect.fn("DeliveryOptions.Policies.canDelete.make")(canEdit.make),
  });

  const canRestore = PoliciesContract.makePolicy(DeliveryOptionsContract.canRestore, {
    make: Effect.fn("DeliveryOptions.Policies.canRestore.make")(({ id }) =>
      AccessControl.userPolicy({ name: DeliveryOptionsContract.Table.name, id }, ({ tenantId }) =>
        repository
          .findById(id, tenantId)
          .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNotNull)),
      ),
    ),
  });

  return { canEdit, canDelete, canRestore } as const;
});

export const layer = makeService.pipe(Layer.effect(DeliveryOptionsPolicies));
