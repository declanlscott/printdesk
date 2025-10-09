import { Effect, Equal, Predicate, Struct } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Models } from "../models2";
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

        const isSelf = DataAccessContract.makePolicy(UsersContract.isSelf, {
          make: ({ id }) =>
            AccessControl.policy((principal) =>
              Effect.succeed(Equal.equals(id, principal.userId)),
            ),
        });

        const canEdit = DataAccessContract.makePolicy(UsersContract.canEdit, {
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

        const canDelete = DataAccessContract.makePolicy(
          UsersContract.canDelete,
          { make: canEdit.make },
        );

        const canRestore = DataAccessContract.makePolicy(
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

        const edit = DataAccessContract.makeMutation(UsersContract.edit, {
          makePolicy: ({ id }) =>
            AccessControl.every(
              AccessControl.permission("users:update"),
              policies.canEdit.make({ id }),
            ),
          mutator: ({ id, ...user }) => repository.updateById(id, () => user),
        });

        const delete_ = DataAccessContract.makeMutation(UsersContract.delete_, {
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

        const restore = DataAccessContract.makeMutation(UsersContract.restore, {
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
