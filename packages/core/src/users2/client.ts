import { Effect, Equal } from "effect";

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
      succeed: {
        isSelf: DataAccessContract.makePolicy(UsersContract.isSelf, {
          make: ({ id }) =>
            AccessControl.policy((principal) =>
              Effect.succeed(Equal.equals(id, principal.userId)),
            ),
        }),
      },
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/users/client/Mutations",
    {
      accessors: true,
      dependencies: [WriteRepository.Default, Policies.Default],
      effect: Effect.gen(function* () {
        const repository = yield* WriteRepository;

        const isSelf = yield* Policies.isSelf;

        const update = DataAccessContract.makeMutation(UsersContract.update, {
          makePolicy: () => AccessControl.permission("users:update"),
          mutator: ({ id, ...user }) => repository.updateById(id, () => user),
        });

        const delete_ = DataAccessContract.makeMutation(UsersContract.delete_, {
          makePolicy: ({ id }) =>
            AccessControl.some(
              AccessControl.permission("users:delete"),
              isSelf.make({ id }),
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
          makePolicy: () => AccessControl.permission("users:delete"),
          mutator: ({ id }) =>
            repository.updateById(id, () => ({ deletedAt: null })),
        });

        return { update, delete: delete_, restore } as const;
      }),
    },
  ) {}
}
