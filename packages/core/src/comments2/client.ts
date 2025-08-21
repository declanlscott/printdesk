import { Effect, Equal } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Orders } from "../orders2/client";
import { Replicache } from "../replicache2/client";
import { CommentsContract } from "./contract";

export namespace Comments {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/comments/client/ReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(CommentsContract.table),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/comments/client/WriteRepository",
    {
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(CommentsContract.table, repository),
        ),
      ),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/comments/client/Policies",
    {
      accessors: true,
      dependencies: [ReadRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ReadRepository;

        const isAuthor = DataAccessContract.makePolicy(
          CommentsContract.isAuthor,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository.findById(id).pipe(
                  Effect.map(({ authorId }) => authorId),
                  Effect.map(Equal.equals(principal.userId)),
                ),
              ),
          }),
        );

        return { isAuthor } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/comments/client/Mutations",
    {
      accessors: true,
      dependencies: [
        WriteRepository.Default,
        Orders.Policies.Default,
        Policies.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* WriteRepository;

        const isCustomerOrManager = yield* Orders.Policies.isCustomerOrManager;
        const hasActiveManagerAuthorization =
          yield* Orders.Policies.hasActiveManagerAuthorization;

        const isAuthor = yield* Policies.isAuthor;

        const create = DataAccessContract.makeMutation(
          CommentsContract.create,
          Effect.succeed({
            makePolicy: ({ orderId }) =>
              AccessControl.some(
                AccessControl.permission("comments:create"),
                isCustomerOrManager.make({ id: orderId }),
                hasActiveManagerAuthorization.make({ id: orderId }),
              ),
            mutator: (comment, session) =>
              repository.create(
                CommentsContract.table.Schema.make({
                  ...comment,
                  authorId: session.userId,
                  tenantId: session.tenantId,
                }),
              ),
          }),
        );

        const update = DataAccessContract.makeMutation(
          CommentsContract.update,
          Effect.succeed({
            makePolicy: ({ id }) =>
              AccessControl.some(
                AccessControl.permission("comments:update"),
                isAuthor.make({ id }),
              ),
            mutator: ({ id, ...comment }) => repository.updateById(id, comment),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          CommentsContract.delete_,
          Effect.succeed({
            makePolicy: ({ id }) =>
              AccessControl.some(
                AccessControl.permission("comments:delete"),
                isAuthor.make({ id }),
              ),
            mutator: ({ id, deletedAt }) =>
              repository.updateById(id, { deletedAt }).pipe(
                AccessControl.enforce(
                  AccessControl.permission("comments:read"),
                ),
                Effect.catchTag("AccessDeniedError", () =>
                  repository.deleteById(id),
                ),
              ),
          }),
        );

        return { create, update, delete: delete_ } as const;
      }),
    },
  ) {}
}
