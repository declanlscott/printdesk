import { Effect, Equal } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Replicache } from "../replicache2/client";
import { UsersContract } from "./contract";

export namespace Users {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/users/client/ReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(UsersContract.table),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/users/client/WriteRepository",
    {
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(UsersContract.table, repository),
        ),
      ),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/users/client/Policies",
    {
      accessors: true,
      succeed: {
        isSelf: DataAccessContract.makePolicy(
          UsersContract.isSelf,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                Effect.succeed(Equal.equals(id, principal.userId)),
              ),
          }),
        ),
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

        const update = DataAccessContract.makeMutation(
          UsersContract.update,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("users:update"),
            mutator: (user) => repository.updateById(user.id, user),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          UsersContract.delete_,
          Effect.succeed({
            makePolicy: ({ id }) =>
              AccessControl.some(
                AccessControl.permission("users:delete"),
                isSelf.make({ id }),
              ),
            mutator: ({ id, deletedAt }) =>
              repository.updateById(id, { deletedAt }).pipe(
                AccessControl.enforce(AccessControl.permission("users:read")),
                Effect.catchTag("AccessDeniedError", () =>
                  repository.deleteById(id),
                ),
              ),
          }),
        );

        const restore = DataAccessContract.makeMutation(
          UsersContract.restore,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("users:delete"),
            mutator: ({ id }) => repository.updateById(id, { deletedAt: null }),
          }),
        );

        return { update, delete: delete_, restore } as const;
      }),
    },
  ) {}
}
