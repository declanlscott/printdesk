import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { AnnouncementsRepository } from ".";
import { repositoryFactory } from "../../../database/client/repository-factory";
import { AnnouncementsContract } from "../../contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* repositoryFactory(AnnouncementsContract.Table);

  const updateByRoomId = (
    roomId: typeof AnnouncementsContract.Table.Model.Type.roomId,
    announcement: Partial<
      Omit<typeof AnnouncementsContract.Table.Model.Type, "id" | "roomId" | "tenantId">
    >,
  ) =>
    repository
      .findWhere((a) =>
        a.roomId == roomId
          ? Result.succeed(repository.updateById(a.id, () => Effect.succeed(announcement)))
          : Result.failVoid,
      )
      .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" })));

  const deleteByRoomId = (roomId: typeof AnnouncementsContract.Table.Model.Type.roomId) =>
    repository
      .findWhere((a) =>
        a.roomId === roomId ? Result.succeed(repository.deleteById(a.id)) : Result.failVoid,
      )
      .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" })));

  return {
    ...repository,
    updateByRoomId,
    deleteByRoomId,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(AnnouncementsRepository));
