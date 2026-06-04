import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";

import { UsersMutations } from ".";
import { AccessControl } from "../../access-control";
import { Mutation } from "../../mutations";
import { ReplicacheContract } from "../../replicache/contracts";
import { ReplicacheNotifier } from "../../replicache/notifier";
import { UsersContract } from "../contract";
import { UsersPolicies } from "../policies";
import { UsersRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* UsersRepository;

  const policies = yield* UsersPolicies;

  const notifier = yield* ReplicacheNotifier;

  const notifyEdit = (user: typeof UsersContract.Table.Model.Type) =>
    Match.value(user).pipe(
      Match.when({ deletedAt: Match.null }, () =>
        Array.make(
          ReplicacheContract.PullPermission.make({ permission: "users:read" }),
          ReplicacheContract.PullPermission.make({ permission: "active_users:read" }),
        ),
      ),
      Match.orElse(() =>
        Array.make(ReplicacheContract.PullPermission.make({ permission: "users:read" })),
      ),
      notifier.notify,
    );

  const notifyDelete = () =>
    notifier.notify(
      Array.make(
        ReplicacheContract.PullPermission.make({ permission: "users:read" }),
        ReplicacheContract.PullPermission.make({ permission: "active_users:read" }),
      ),
    );
  const notifyRestore = notifyDelete;

  const edit = Mutation.make(UsersContract.edit, {
    makePolicy: Effect.fn("Users.Mutations.edit.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("users:update"),
        policies.canEdit.make({ id }),
      ),
    ),
    mutator: Effect.fn("Users.Mutations.edit.mutator")((user, { tenantId }) =>
      repository.updateById(user.id, user, tenantId).pipe(Effect.tap(notifyEdit)),
    ),
  });

  const delete_ = Mutation.make(UsersContract.delete_, {
    makePolicy: Effect.fn("Users.Mutations.delete.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.some(
          AccessControl.userPermissionPolicy("users:delete"),
          policies.isSelf.make({ id }),
        ),
        policies.canDelete.make({ id }),
      ),
    ),
    mutator: Effect.fn("Users.Mutations.delete.mutator")(({ id, deletedAt }, { tenantId }) =>
      repository.updateById(id, { deletedAt }, tenantId).pipe(Effect.tap(notifyDelete)),
    ),
  });

  const restore = Mutation.make(UsersContract.restore, {
    makePolicy: Effect.fn("Users.Mutations.restore.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("users:delete"),
        policies.canRestore.make({ id }),
      ),
    ),
    mutator: Effect.fn("Users.Mutations.restore.mutator")(({ id }, { tenantId }) =>
      repository.updateById(id, { deletedAt: null }, tenantId).pipe(Effect.tap(notifyRestore)),
    ),
  });

  return { edit, delete: delete_, restore } as const;
});

export const layer = makeService.pipe(Layer.effect(UsersMutations));
