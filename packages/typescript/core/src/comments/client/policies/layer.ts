import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { CommentsPolicies } from ".";
import { AccessControl } from "../../../access-control";
import { PoliciesContract } from "../../../policies/contract";
import { CommentsContract } from "../../contract";
import { CommentsReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* CommentsReadRepository;

  const isAuthor = PoliciesContract.makePolicy(CommentsContract.isAuthor, {
    make: ({ id, authorId }) =>
      AccessControl.userPolicy({ name: CommentsContract.Table.name, id }, (user) =>
        repository
          .findById(id)
          .pipe(
            Effect.map(Struct.get("authorId")),
            Effect.map(Equal.equals(authorId.pipe(Option.getOrElse(() => user.id)))),
          ),
      ),
  });

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

  const canDelete = PoliciesContract.makePolicy(CommentsContract.canDelete, {
    make: canEdit.make,
  });

  const canRestore = PoliciesContract.makePolicy(CommentsContract.canRestore, {
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
