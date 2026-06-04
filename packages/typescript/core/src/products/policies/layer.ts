import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { ProductsPolicies } from ".";
import { AccessControl } from "../../access-control";
import { Policy } from "../../policies";
import { RoomsRepository } from "../../rooms/repository";
import { ProductsContract } from "../contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* RoomsRepository;

  const canEdit = Policy.make(ProductsContract.canEdit, {
    make: Effect.fn("Products.Policies.canEdit.make")(({ id }) =>
      AccessControl.userPolicy({ name: ProductsContract.Table.name, id }, ({ tenantId }) =>
        repository
          .findById(id, tenantId)
          .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNull)),
      ),
    ),
  });

  const canDelete = Policy.make(ProductsContract.canDelete, {
    make: Effect.fn("Products.Policies.canDelete.make")(({ id }) =>
      AccessControl.userPolicy({ name: ProductsContract.Table.name, id }, ({ tenantId }) =>
        repository
          .findById(id, tenantId)
          .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNull)),
      ),
    ),
  });

  const canRestore = Policy.make(ProductsContract.canRestore, {
    make: Effect.fn("Products.Policies.canRestore.make")(({ id }) =>
      AccessControl.userPolicy({ name: ProductsContract.Table.name, id }, ({ tenantId }) =>
        repository
          .findById(id, tenantId)
          .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNotNull)),
      ),
    ),
  });

  return { canEdit, canDelete, canRestore } as const;
});

export const layer = makeService.pipe(Layer.effect(ProductsPolicies));
