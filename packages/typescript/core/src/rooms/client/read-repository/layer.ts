import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { RoomsReadRepository } from ".";
import { makeReadRepository } from "../../../database/client/read-repository";
import { RoomsContract } from "../../contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = makeReadRepository(RoomsContract.Table);

export const layer = makeService.pipe(Layer.effect(RoomsReadRepository));
