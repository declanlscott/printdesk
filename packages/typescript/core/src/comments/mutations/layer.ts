import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import { CommentsMutations } from ".";
import { AccessControl } from "../../access-control";
import { Mutation } from "../../mutations";
import { OrdersContract } from "../../orders/contract";
import { OrdersPolicies } from "../../orders/policies";
import { ReplicacheContract } from "../../replicache/contracts";
import { ReplicacheNotifier } from "../../replicache/notifier";
import { CommentsContract } from "../contract";
import { CommentsPolicies } from "../policies";
import { CommentsRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* CommentsRepository;

  const orderPolicies = yield* OrdersPolicies;
  const policies = yield* CommentsPolicies;

  const notifier = yield* ReplicacheNotifier;

  const notify = (comment: typeof CommentsContract.Table.Model.Type) =>
    notifier.notify(
      Array.make(
        ReplicacheContract.PullPermission.make({ permission: "comments:read" }),
        ReplicacheContract.PullPermission.make({ permission: "active_comments:read" }),
        ReplicacheContract.PullPolicy.make(
          OrdersContract.isCustomerOrManager.make({ id: comment.orderId, userId: Option.none() }),
        ),
        ReplicacheContract.PullPolicy.make(
          OrdersContract.isManagerAuthorized.make({
            id: comment.orderId,
            managerId: Option.none(),
          }),
        ),
      ),
    );

  const create = Mutation.make(CommentsContract.create, {
    makePolicy: Effect.fn("Comments.Mutations.create.makePolicy")(({ orderId }) =>
      AccessControl.some(
        AccessControl.userPermissionPolicy("comments:create"),
        orderPolicies.isCustomerOrManager.make({ id: orderId, userId: Option.none() }),
        orderPolicies.isManagerAuthorized.make({ id: orderId, managerId: Option.none() }),
      ),
    ),
    mutator: Effect.fn("Comments.Mutations.create.mutator")((comment, user) =>
      repository
        .create({ ...comment, authorId: user.id, tenantId: user.tenantId })
        .pipe(Effect.tap(notify)),
    ),
  });

  const edit = Mutation.make(CommentsContract.edit, {
    makePolicy: Effect.fn("Comments.Mutations.edit.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.some(
          AccessControl.userPermissionPolicy("comments:update"),
          policies.isAuthor.make({ id, authorId: Option.none() }),
        ),
        policies.canEdit.make({ id }),
      ),
    ),
    mutator: Effect.fn("Comments.Mutations.edit.mutator")(({ id, ...comment }, user) =>
      repository.updateById(id, comment, user.tenantId).pipe(Effect.tap(notify)),
    ),
  });

  const delete_ = Mutation.make(CommentsContract.delete_, {
    makePolicy: Effect.fn("Comments.Mutations.delete.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.some(
          AccessControl.userPermissionPolicy("comments:delete"),
          policies.isAuthor.make({ id, authorId: Option.none() }),
        ),
        policies.canDelete.make({ id }),
      ),
    ),
    mutator: Effect.fn("Comments.Mutations.delete.mutator")(({ id, deletedAt }, user) =>
      repository.updateById(id, { deletedAt }, user.tenantId).pipe(Effect.tap(notify)),
    ),
  });

  const restore = Mutation.make(CommentsContract.restore, {
    makePolicy: Effect.fn("Comments.Mutations.restore.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("comments:delete"),
        policies.canRestore.make({ id }),
      ),
    ),
    mutator: Effect.fn("Comments.Mutations.restore.mutator")(({ id }, user) =>
      repository.updateById(id, { deletedAt: null }, user.tenantId).pipe(Effect.tap(notify)),
    ),
  });

  return { create, edit, delete: delete_, restore } as const;
});

export const layer = makeService.pipe(Layer.effect(CommentsMutations));
