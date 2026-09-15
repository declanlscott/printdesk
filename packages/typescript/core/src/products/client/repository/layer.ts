import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { ProductsRepository } from ".";
import { repositoryFactory } from "../../../database/client/repository-factory";
import { OrdersRepository } from "../../../orders/client/repository";
import { ProductsContract } from "../../contract";

import type { OrdersContract } from "../../../orders/contracts";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* repositoryFactory(ProductsContract.Table);
  const ordersRepository = yield* OrdersRepository;

  const findByOrderId = Effect.fn((orderId: typeof OrdersContract.Table.Model.Type.id) =>
    ordersRepository
      .findById(orderId)
      .pipe(Effect.flatMap((order) => repository.findById(order.productId))),
  );

  const updateByRoomId = Effect.fn(
    (
      roomId: typeof ProductsContract.Table.Model.Type.roomId,
      product: Partial<
        Omit<typeof ProductsContract.Table.Model.Type, "id" | "roomId" | "tenantId">
      >,
    ) =>
      repository
        .findWhere((p) =>
          p.roomId === roomId
            ? Result.succeed(repository.updateById(p.id, () => Effect.succeed(product)))
            : Result.failVoid,
        )
        .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" }))),
  );

  const deleteByRoomId = Effect.fn((roomId: typeof ProductsContract.Table.Model.Type.roomId) =>
    repository
      .findWhere((p) =>
        p.roomId === roomId ? Result.succeed(repository.deleteById(p.id)) : Result.failVoid,
      )
      .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" }))),
  );

  return {
    ...repository,
    findByOrderId,
    updateByRoomId,
    deleteByRoomId,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(ProductsRepository));
