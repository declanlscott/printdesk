import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { AccessControl } from "../access-control2";
import { Models } from "../models2";
import { MutationsContract } from "../mutations/contract";
import { PoliciesContract } from "../policies/contract";
import { Replicache } from "../replicache2/client";
import { UsersContract } from "./contract";

export namespace Users {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/users/client/ReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: Models.SyncTables.users.pipe(
        Effect.flatMap(Replicache.makeReadRepository),
      ),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/users/client/WriteRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.all([Models.SyncTables.users, ReadRepository]).pipe(
        Effect.flatMap((args) => Replicache.makeWriteRepository(...args)),
      ),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/users/client/Policies",
    {
      accessors: true,
      dependencies: [ReadRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ReadRepository;

        const isSelf = PoliciesContract.makePolicy(UsersContract.isSelf, {
          make: ({ id }) =>
            AccessControl.policy((principal) =>
              Effect.succeed(Equal.equals(id, principal.userId)),
            ),
        });

        const canEdit = PoliciesContract.makePolicy(UsersContract.canEdit, {
          make: ({ id }) =>
            AccessControl.policy(() =>
              repository
                .findById(id)
                .pipe(
                  Effect.map(Struct.get("deletedAt")),
                  Effect.map(Predicate.isNull),
                ),
            ),
        });

        const canDelete = PoliciesContract.makePolicy(UsersContract.canDelete, {
          make: canEdit.make,
        });

        const canRestore = PoliciesContract.makePolicy(
          UsersContract.canRestore,
          {
            make: ({ id }) =>
              AccessControl.policy(() =>
                repository
                  .findById(id)
                  .pipe(
                    Effect.map(Struct.get("deletedAt")),
                    Effect.map(Predicate.isNotNull),
                  ),
              ),
          },
        );

        return { isSelf, canEdit, canDelete, canRestore } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/users/client/Mutations",
    {
      accessors: true,
      dependencies: [WriteRepository.Default, Policies.Default],
      effect: Effect.gen(function* () {
        const repository = yield* WriteRepository;

        const policies = yield* Policies;

        const edit = MutationsContract.makeMutation(UsersContract.edit, {
          makePolicy: ({ id }) =>
            AccessControl.every(
              AccessControl.permission("users:update"),
              policies.canEdit.make({ id }),
            ),
          mutator: ({ id, ...user }) => repository.updateById(id, () => user),
        });

        const delete_ = MutationsContract.makeMutation(UsersContract.delete_, {
          makePolicy: ({ id }) =>
            AccessControl.every(
              AccessControl.some(
                AccessControl.permission("users:delete"),
                policies.isSelf.make({ id }),
              ),
              policies.canDelete.make({ id }),
            ),
          mutator: ({ id, deletedAt }) =>
            repository
              .updateById(id, () => ({ deletedAt }))
              .pipe(
                AccessControl.enforce(AccessControl.permission("users:read")),
                Effect.catchTag("AccessDeniedError", () =>
                  repository.deleteById(id),
                ),
              ),
        });

        const restore = MutationsContract.makeMutation(UsersContract.restore, {
          makePolicy: ({ id }) =>
            AccessControl.every(
              AccessControl.permission("users:delete"),
              policies.canRestore.make({ id }),
            ),
          mutator: ({ id }) =>
            repository.updateById(id, () => ({ deletedAt: null })),
        });

        return { edit, delete: delete_, restore } as const;
      }),
    },
  ) {}
}
