import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { DeliveryOptionsReadRepository } from ".";
import { makeReadRepository } from "../../../database/client/read-repository";
import { DeliveryOptionsContract } from "../../contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = makeReadRepository(DeliveryOptionsContract.Table);

export const layer = makeService.pipe(Layer.effect(DeliveryOptionsReadRepository));
