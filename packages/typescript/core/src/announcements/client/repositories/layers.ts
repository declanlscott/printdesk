import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { AnnouncementsReadRepository, AnnouncementsWriteRepository } from ".";
import {
  readRepositoryFactory,
  writeRepositoryFactory,
} from "../../../database/client/repositories";
import { AnnouncementsContract } from "../../contract";

export type ReadRepository = Effect.Success<typeof makeReadRepository>;
export const makeReadRepository = readRepositoryFactory(AnnouncementsContract.Table);
export const readRepositoryLayer = makeReadRepository.pipe(
  Layer.effect(AnnouncementsReadRepository),
);

export type WriteRepository = Effect.Success<typeof makeWriteRepository>;
export const makeWriteRepository = Effect.gen(function* () {
  const repository = yield* AnnouncementsReadRepository;
  const base = yield* writeRepositoryFactory(AnnouncementsContract.Table, repository);

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
export const writeRepositoryLayer = makeWriteRepository.pipe(
  Layer.effect(AnnouncementsWriteRepository),
);
