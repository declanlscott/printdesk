import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { DeliveryOptionsPolicies } from ".";
import { AccessControl } from "../../../access-control";
import { PoliciesContract } from "../../../policies/contract";
import { DeliveryOptionsContract } from "../../contract";
import { DeliveryOptionsReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* DeliveryOptionsReadRepository;

  const canEdit = PoliciesContract.makePolicy(DeliveryOptionsContract.canEdit, {
    make: ({ id }) =>
      repository
        .findById(id)
        .pipe(
          Effect.map(Struct.get("deletedAt")),
          Effect.map(Predicate.isNull),
          AccessControl.policy({ name: DeliveryOptionsContract.Table.name, id }),
        ),
  });

  const canDelete = PoliciesContract.makePolicy(DeliveryOptionsContract.canDelete, {
    make: canEdit.make,
  });

  const canRestore = PoliciesContract.makePolicy(DeliveryOptionsContract.canRestore, {
    make: ({ id }) =>
      repository
        .findById(id)
        .pipe(
          Effect.map(Struct.get("deletedAt")),
          Effect.map(Predicate.isNotNull),
          AccessControl.policy({ name: DeliveryOptionsContract.Table.name, id }),
        ),
  });

  return { canEdit, canDelete, canRestore } as const;
});

export const layer = makeService.pipe(Layer.effect(DeliveryOptionsPolicies));
