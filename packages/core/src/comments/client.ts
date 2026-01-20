import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { AccessControl } from "../access-control";
import { Models } from "../models";
import { MutationsContract } from "../mutations/contract";
import { Orders } from "../orders/client";
import { PoliciesContract } from "../policies/contract";
import { Replicache } from "../replicache/client";
import { CommentsContract } from "./contract";

export namespace Comments {
  const Table = Models.syncTables[CommentsContract.Table.name];

  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/comments/client/ReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(Table),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/comments/client/WriteRepository",
    {
      accessors: true,
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(Table, repository),
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

        const isAuthor = PoliciesContract.makePolicy(
          CommentsContract.isAuthor,
          {
            make: ({ id }) =>
              AccessControl.userPolicy(
                { name: CommentsContract.Table.name, id },
                (user) =>
                  repository
                    .findById(id)
                    .pipe(
                      Effect.map(Struct.get("authorId")),
                      Effect.map(Equal.equals(user.id)),
                    ),
              ),
          },
        );

        const canEdit = PoliciesContract.makePolicy(CommentsContract.canEdit, {
          make: ({ id }) =>
            repository
              .findById(id)
              .pipe(
                Effect.map(Struct.get("deletedAt")),
                Effect.map(Predicate.isNull),
                AccessControl.policy({ name: CommentsContract.Table.name, id }),
              ),
        });

        const canDelete = PoliciesContract.makePolicy(
          CommentsContract.canDelete,
          { make: canEdit.make },
        );

        const canRestore = PoliciesContract.makePolicy(
          CommentsContract.canRestore,
          {
            make: ({ id }) =>
              repository.findById(id).pipe(
                Effect.map(Struct.get("deletedAt")),
                Effect.map(Predicate.isNotNull),
                AccessControl.policy({
                  name: CommentsContract.Table.name,
                  id,
                }),
              ),
          },
        );

        return { isAuthor, canEdit, canDelete, canRestore } as const;
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

        const orderPolicies = yield* Orders.Policies;
        const policies = yield* Policies;

        const create = MutationsContract.makeMutation(CommentsContract.create, {
          makePolicy: ({ orderId }) =>
            AccessControl.some(
              AccessControl.permission("comments:create"),
              orderPolicies.isCustomerOrManager.make({ id: orderId }),
              orderPolicies.isManagerAuthorized.make({ id: orderId }),
            ),
          mutator: (comment, user) =>
            repository.create(
              new CommentsContract.Table.DataTransferObject({
                ...comment,
                authorId: user.id,
                tenantId: user.tenantId,
              }),
            ),
        });

        const edit = MutationsContract.makeMutation(CommentsContract.edit, {
          makePolicy: ({ id }) => policies.canEdit.make({ id }),
          mutator: ({ id, ...comment }) =>
            repository.updateById(id, () => comment),
        });

        const delete_ = MutationsContract.makeMutation(
          CommentsContract.delete_,
          {
            makePolicy: ({ id }) => policies.canDelete.make({ id }),
            mutator: ({ id, deletedAt }) =>
              repository
                .updateById(id, () => ({ deletedAt }))
                .pipe(
                  AccessControl.enforce(
                    AccessControl.permission("comments:read"),
                  ),
                  Effect.catchTag("AccessDeniedError", () =>
                    repository.deleteById(id),
                  ),
                ),
          },
        );

        const restore = MutationsContract.makeMutation(
          CommentsContract.restore,
          {
            makePolicy: ({ id }) => policies.canRestore.make({ id }),
            mutator: ({ id }) =>
              repository.updateById(id, () => ({ deletedAt: null })),
          },
        );

        return { create, edit, delete: delete_, restore } as const;
      }),
    },
  ) {}
}
