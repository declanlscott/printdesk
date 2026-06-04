import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { DeliveryOptionsPolicies } from ".";
import { AccessControl } from "../../../access-control";
import { Policy } from "../../../policies";
import { DeliveryOptionsContract } from "../../contract";
import { DeliveryOptionsReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* DeliveryOptionsReadRepository;

  const canEdit = Policy.make(DeliveryOptionsContract.canEdit, {
    make: ({ id }) =>
      repository
        .findById(id)
        .pipe(
          Effect.map(Struct.get("deletedAt")),
          Effect.map(Predicate.isNull),
          AccessControl.policy({ name: DeliveryOptionsContract.Table.name, id }),
        ),
  });

  const canDelete = Policy.make(DeliveryOptionsContract.canDelete, {
    make: canEdit.make,
  });

  const canRestore = Policy.make(DeliveryOptionsContract.canRestore, {
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
