import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { GroupMembershipsRepository } from ".";
import { repositoryFactory } from "../../../../database/client/repository-factory";
import { GroupMembershipsContract } from "../../../contracts";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* repositoryFactory(GroupMembershipsContract.Table);

  const findActiveByIds = Effect.fn(
    (
      groupId: typeof GroupMembershipsContract.Table.Model.Type.groupId,
      userId: typeof GroupMembershipsContract.Table.Model.Type.userId,
    ) =>
      repository.findWhere((membership) =>
        membership.groupId === groupId &&
        membership.userId === userId &&
        membership.deletedAt === null
          ? Result.succeed(membership)
          : Result.failVoid,
      ),
  );

  return { ...repository, findActiveByIds } as const;
});

export const layer = makeService.pipe(Layer.effect(GroupMembershipsRepository));
