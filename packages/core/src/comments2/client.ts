import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { AccessControl } from "../access-control2";
import { Models } from "../models2";
import { MutationsContract } from "../mutations/contract";
import { Orders } from "../orders2/client";
import { PoliciesContract } from "../policies/contract";
import { Replicache } from "../replicache2/client";
import { CommentsContract } from "./contract";

export namespace Comments {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/comments/client/ReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: Models.SyncTables.comments.pipe(
        Effect.flatMap(Replicache.makeReadRepository),
      ),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/comments/client/WriteRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.all([Models.SyncTables.comments, ReadRepository]).pipe(
        Effect.flatMap((args) => Replicache.makeWriteRepository(...args)),
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
              AccessControl.policy((principal) =>
                repository
                  .findById(id)
                  .pipe(
                    Effect.map(Struct.get("authorId")),
                    Effect.map(Equal.equals(principal.userId)),
                  ),
              ),
          },
        );

        const canEdit = PoliciesContract.makePolicy(CommentsContract.canEdit, {
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

        const canDelete = PoliciesContract.makePolicy(
          CommentsContract.canDelete,
          { make: canEdit.make },
        );

        const canRestore = PoliciesContract.makePolicy(
          CommentsContract.canRestore,
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
          mutator: (comment, session) =>
            repository.create(
              CommentsContract.DataTransferObject.make({
                ...comment,
                authorId: session.userId,
                tenantId: session.tenantId,
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
