import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { SharedAccountsPolicies } from ".";
import { AccessControl } from "../../access-control";
import { Policy } from "../../policies";
import { SharedAccountsContract } from "../contracts";
import { SharedAccountsRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* SharedAccountsRepository;

  const isCustomerAuthorized = Policy.make(SharedAccountsContract.isCustomerAuthorized, {
    make: Effect.fn("SharedAccounts.Policies.isCustomerAuthorized.make")(({ id, customerId }) =>
      AccessControl.userPolicy({ name: SharedAccountsContract.Table.name, id }, (user) =>
        repository
          .findActiveAuthorizedCustomerIds(id, user.tenantId)
          .pipe(
            Effect.map(Array.some(Equal.equals(customerId.pipe(Option.getOrElse(() => user.id))))),
          ),
      ),
    ),
  });

  const isManagerAuthorized = Policy.make(SharedAccountsContract.isManagerAuthorized, {
    make: Effect.fn("SharedAccounts.Policies.isManagerAuthorized.make")(({ id, managerId }) =>
      AccessControl.userPolicy({ name: SharedAccountsContract.Table.name, id }, (user) =>
        repository
          .findActiveAuthorizedManagerIds(id, user.tenantId)
          .pipe(
            Effect.map(Array.some(Equal.equals(managerId.pipe(Option.getOrElse(() => user.id))))),
          ),
      ),
    ),
  });

  const canEdit = Policy.make(SharedAccountsContract.canEdit, {
    make: Effect.fn("SharedAccounts.Policies.canEdit.make")(({ id }) =>
      AccessControl.userPolicy({ name: SharedAccountsContract.Table.name, id }, ({ tenantId }) =>
        repository
          .findById(id, tenantId)
          .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNull)),
      ),
    ),
  });

  const canDelete = Policy.make(SharedAccountsContract.canDelete, {
    make: Effect.fn("SharedAccounts.Policies.canDelete.make")(canEdit.make),
  });

  const canRestore = Policy.make(SharedAccountsContract.canRestore, {
    make: Effect.fn("SharedAccounts.Policies.canRestore.make")(({ id }) =>
      AccessControl.userPolicy({ name: SharedAccountsContract.Table.name, id }, ({ tenantId }) =>
        repository
          .findById(id, tenantId)
          .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNotNull)),
      ),
    ),
  });

  return {
    isCustomerAuthorized,
    isManagerAuthorized,
    canEdit,
    canDelete,
    canRestore,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(SharedAccountsPolicies));
