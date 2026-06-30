import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { SharedAccountsPolicies } from ".";
import { AccessControl } from "../../../access-control";
import { Policy } from "../../../policies";
import { SharedAccountsContract } from "../../contracts";
import { SharedAccountsReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* SharedAccountsReadRepository;

  const isCustomerAuthorized = Policy.make(SharedAccountsContract.isCustomerAuthorized, {
    make: ({ id, customerId }) =>
      AccessControl.userPolicy(
        (user) =>
          repository
            .findActiveAuthorizedCustomerIds(id)
            .pipe(
              Effect.map(
                Array.some(Equal.equals(customerId.pipe(Option.getOrElse(() => user.id)))),
              ),
            ),
        { name: SharedAccountsContract.Table.name, id },
      ),
  });

  const isManagerAuthorized = Policy.make(SharedAccountsContract.isManagerAuthorized, {
    make: ({ id, managerId }) =>
      AccessControl.userPolicy(
        (user) =>
          repository
            .findActiveAuthorizedManagerIds(id)
            .pipe(
              Effect.map(Array.some(Equal.equals(managerId.pipe(Option.getOrElse(() => user.id))))),
            ),
        { name: SharedAccountsContract.Table.name, id },
      ),
  });

  const canEdit = Policy.make(SharedAccountsContract.canEdit, {
    make: ({ id }) =>
      repository.findById(id).pipe(
        Effect.map(Struct.get("deletedAt")),
        Effect.map(Predicate.isNull),
        AccessControl.policy({
          name: SharedAccountsContract.Table.name,
          id,
        }),
      ),
  });

  const canDelete = Policy.make(SharedAccountsContract.canDelete, {
    make: canEdit.make,
  });

  const canRestore = Policy.make(SharedAccountsContract.canRestore, {
    make: ({ id }) =>
      repository.findById(id).pipe(
        Effect.map(Struct.get("deletedAt")),
        Effect.map(Predicate.isNotNull),
        AccessControl.policy({
          name: SharedAccountsContract.Table.name,
          id,
        }),
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
