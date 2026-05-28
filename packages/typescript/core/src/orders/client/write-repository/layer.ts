import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { OrdersWriteRepository } from ".";
import { makeWriteRepository } from "../../../database/client/write-repository";
import { OrdersContract } from "../../contract";
import { OrdersReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = OrdersReadRepository.pipe(
  Effect.flatMap((repository) => makeWriteRepository(OrdersContract.Table, repository)),
);

export const layer = makeService.pipe(Layer.effect(OrdersWriteRepository));
