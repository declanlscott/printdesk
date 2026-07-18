import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { GroupMembershipsReadRepository } from ".";
import { readRepositoryFactory } from "../../../../database/client/repositories";
import { GroupMembershipsContract } from "../../../contracts";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const base = yield* readRepositoryFactory(GroupMembershipsContract.Table);

  const findActiveByIds = Effect.fn(
    (
      groupId: typeof GroupMembershipsContract.Table.Model.Type.groupId,
      userId: typeof GroupMembershipsContract.Table.Model.Type.userId,
    ) =>
      base.findWhere((membership) =>
        membership.groupId === groupId &&
        membership.userId === userId &&
        membership.deletedAt === null
          ? Result.succeed(membership)
          : Result.failVoid,
      ),
  );

  return { ...base, findActiveByIds } as const;
});

export const layer = makeService.pipe(Layer.effect(GroupMembershipsReadRepository));
