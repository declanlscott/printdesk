import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { CommentsPolicies } from ".";
import { AccessControl } from "../../access-control";
import { Policy } from "../../policies";
import { CommentsContract } from "../contract";
import { CommentsRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* CommentsRepository;

  const isAuthor = Policy.make(CommentsContract.isAuthor, {
    make: Effect.fn("Comments.Policies.isAuthor.make")(({ id, authorId }) =>
      AccessControl.userPolicy(
        (user) =>
          repository
            .findById(id, user.tenantId)
            .pipe(
              Effect.map(Struct.get("authorId")),
              Effect.map(Equal.equals(authorId.pipe(Option.getOrElse(() => user.id)))),
            ),
        { name: CommentsContract.Table.name, id },
      ),
    ),
  });

  const canEdit = Policy.make(CommentsContract.canEdit, {
    make: Effect.fn("Comments.Policies.canEdit.make")(({ id }) =>
      AccessControl.userPolicy(
        ({ tenantId }) =>
          repository
            .findById(id, tenantId)
            .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNull)),
        { name: CommentsContract.Table.name, id },
      ),
    ),
  });

  const canDelete = Policy.make(CommentsContract.canDelete, {
    make: Effect.fn("Comments.Policies.canDelete.make")(canEdit.make),
  });

  const canRestore = Policy.make(CommentsContract.canRestore, {
    make: Effect.fn("Comments.Policies.canRestore.make")(({ id }) =>
      AccessControl.userPolicy(
        ({ tenantId }) =>
          repository
            .findById(id, tenantId)
            .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNotNull)),
        { name: CommentsContract.Table.name, id },
      ),
    ),
  });

  return { isAuthor, canEdit, canDelete, canRestore } as const;
});

export const layer = makeService.pipe(Layer.effect(CommentsPolicies));
