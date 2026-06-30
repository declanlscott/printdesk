import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { UsersPolicies } from ".";
import { AccessControl } from "../../../access-control";
import { Policy } from "../../../policies";
import { UsersContract } from "../../contract";
import { UsersReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* UsersReadRepository;

  const isSelf = Policy.make(UsersContract.isSelf, {
    make: ({ id }) =>
      AccessControl.userPolicy((user) => Effect.succeed(id === user.id), {
        name: UsersContract.Table.name,
        id,
      }),
  });

  const canEdit = Policy.make(UsersContract.canEdit, {
    make: ({ id }) =>
      repository
        .findById(id)
        .pipe(
          Effect.map(Struct.get("deletedAt")),
          Effect.map(Predicate.isNull),
          AccessControl.policy({ name: UsersContract.Table.name, id }),
        ),
  });

  const canDelete = Policy.make(UsersContract.canDelete, {
    make: canEdit.make,
  });

  const canRestore = Policy.make(UsersContract.canRestore, {
    make: ({ id }) =>
      repository
        .findById(id)
        .pipe(
          Effect.map(Struct.get("deletedAt")),
          Effect.map(Predicate.isNotNull),
          AccessControl.policy({ name: UsersContract.Table.name, id }),
        ),
  });

  return { isSelf, canEdit, canDelete, canRestore } as const;
});

export const layer = makeService.pipe(Layer.effect(UsersPolicies));
