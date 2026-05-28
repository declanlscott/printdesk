import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { AnnouncementsWriteRepository } from ".";
import { makeWriteRepository } from "../../../database/client/write-repository";
import { AnnouncementsContract } from "../../contract";
import { AnnouncementsReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* AnnouncementsReadRepository;
  const base = yield* makeWriteRepository(AnnouncementsContract.Table, repository);

  const updateByRoomId = (
    roomId: (typeof AnnouncementsContract.Table.Model.Type)["roomId"],
    announcement: Partial<
      Omit<typeof AnnouncementsContract.Table.Model.Type, "id" | "roomId" | "tenantId">
    >,
  ) =>
    repository
      .findWhere((a) =>
        a.roomId == roomId
          ? Result.succeed(base.updateById(a.id, () => Effect.succeed(announcement)))
          : Result.failVoid,
      )
      .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" })));

  const deleteByRoomId = (roomId: (typeof AnnouncementsContract.Table.Model.Type)["roomId"]) =>
    repository
      .findWhere((a) =>
        a.roomId === roomId ? Result.succeed(base.deleteById(a.id)) : Result.failVoid,
      )
      .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" })));

  return { ...base, updateByRoomId, deleteByRoomId } as const;
});

export const layer = makeService.pipe(Layer.effect(AnnouncementsWriteRepository));
