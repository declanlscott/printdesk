import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { ProductsWriteRepository } from ".";
import { makeWriteRepository } from "../../../database/client/write-repository";
import { ProductsContract } from "../../contract";
import { ProductsReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* ProductsReadRepository;
  const base = yield* makeWriteRepository(ProductsContract.Table, repository);

  const updateByRoomId = (
    roomId: (typeof ProductsContract.Table.Model.Type)["roomId"],
    product: Partial<Omit<typeof ProductsContract.Table.Model.Type, "id" | "roomId" | "tenantId">>,
  ) =>
    repository
      .findWhere((p) =>
        p.roomId === roomId
          ? Result.succeed(base.updateById(p.id, () => Effect.succeed(product)))
          : Result.failVoid,
      )
      .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" })));

  const deleteByRoomId = (roomId: (typeof ProductsContract.Table.Model.Type)["roomId"]) =>
    repository
      .findWhere((p) =>
        p.roomId === roomId ? Result.succeed(base.deleteById(p.id)) : Result.failVoid,
      )
      .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" })));

  return { ...base, updateByRoomId, deleteByRoomId } as const;
});

export const layer = makeService.pipe(Layer.effect(ProductsWriteRepository));
