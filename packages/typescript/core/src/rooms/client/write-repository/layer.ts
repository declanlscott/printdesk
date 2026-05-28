import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { RoomsWriteRepository } from ".";
import { makeWriteRepository } from "../../../database/client/write-repository";
import { RoomsContract } from "../../contract";
import { RoomsReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = RoomsReadRepository.pipe(
  Effect.flatMap((repository) => makeWriteRepository(RoomsContract.Table, repository)),
);

export const layer = makeService.pipe(Layer.effect(RoomsWriteRepository));
