import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import { CommentsMutations } from ".";
import { AccessControl } from "../../../access-control";
import { Mutation } from "../../../mutations";
import { OrdersPolicies } from "../../../orders/client/policies";
import { CommentsContract } from "../../contract";
import { CommentsPolicies } from "../policies";
import { CommentsWriteRepository } from "../write-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* CommentsWriteRepository;

  const orderPolicies = yield* OrdersPolicies;
  const policies = yield* CommentsPolicies;

  const create = Mutation.make(CommentsContract.create, {
    makePolicy: ({ orderId }) =>
      AccessControl.some(
        AccessControl.userPermissionPolicy("comments:create"),
        orderPolicies.isCustomerOrManager.make({ id: orderId, userId: Option.none() }),
        orderPolicies.isManagerAuthorized.make({ id: orderId, managerId: Option.none() }),
      ),
    mutator: (comment, user) =>
      CommentsContract.Table.Dto.makeEffect({
        ...comment,
        authorId: user.id,
        tenantId: user.tenantId,
      }).pipe(Effect.flatMap(repository.create)),
  });

  const edit = Mutation.make(CommentsContract.edit, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.some(
          AccessControl.userPermissionPolicy("comments:update"),
          policies.isAuthor.make({ id, authorId: Option.none() }),
        ),
        policies.canEdit.make({ id }),
      ),
    mutator: ({ id, ...comment }) => repository.updateById(id, () => Effect.succeed(comment)),
  });

  const delete_ = Mutation.make(CommentsContract.delete_, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.some(
          AccessControl.userPermissionPolicy("comments:delete"),
          policies.isAuthor.make({ id, authorId: Option.none() }),
        ),
        policies.canDelete.make({ id }),
      ),
    mutator: ({ id, deletedAt }) =>
      repository
        .updateById(id, () => Effect.succeed({ deletedAt }))
        .pipe(
          AccessControl.enforce(AccessControl.userPermissionPolicy("comments:read")),
          Effect.catchTag("AccessDeniedError", () => repository.deleteById(id)),
        ),
  });

  const restore = Mutation.make(CommentsContract.restore, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("comments:delete"),
        policies.canRestore.make({ id }),
      ),
    mutator: ({ id }) => repository.updateById(id, () => Effect.succeed({ deletedAt: null })),
  });

  return { create, edit, delete: delete_, restore } as const;
});

export const layer = makeService.pipe(Layer.effect(CommentsMutations));
