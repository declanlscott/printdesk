import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { CommentsPolicies } from ".";
import { AccessControl } from "../../../access-control";
import { Policy } from "../../../policies";
import { CommentsContract } from "../../contract";
import { CommentsReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* CommentsReadRepository;

  const isAuthor = Policy.make(CommentsContract.isAuthor, {
    make: ({ id, authorId }) =>
      AccessControl.userPolicy(
        (user) =>
          repository
            .findById(id)
            .pipe(
              Effect.map(Struct.get("authorId")),
              Effect.map(Equal.equals(authorId.pipe(Option.getOrElse(() => user.id)))),
            ),
        { name: CommentsContract.Table.name, id },
      ),
  });

  const canEdit = Policy.make(CommentsContract.canEdit, {
    make: ({ id }) =>
      repository
        .findById(id)
        .pipe(
          Effect.map(Struct.get("deletedAt")),
          Effect.map(Predicate.isNull),
          AccessControl.policy({ name: CommentsContract.Table.name, id }),
        ),
  });

  const canDelete = Policy.make(CommentsContract.canDelete, {
    make: canEdit.make,
  });

  const canRestore = Policy.make(CommentsContract.canRestore, {
    make: ({ id }) =>
      repository
        .findById(id)
        .pipe(
          Effect.map(Struct.get("deletedAt")),
          Effect.map(Predicate.isNotNull),
          AccessControl.policy({ name: CommentsContract.Table.name, id }),
        ),
  });

  return { isAuthor, canEdit, canDelete, canRestore } as const;
});

export const layer = makeService.pipe(Layer.effect(CommentsPolicies));
