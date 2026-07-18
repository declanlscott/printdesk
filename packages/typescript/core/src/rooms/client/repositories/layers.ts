import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { RoomsReadRepository, RoomsWriteRepository } from ".";
import {
  readRepositoryFactory,
  writeRepositoryFactory,
} from "../../../database/client/repositories";
import { RoomsContract } from "../../contract";

export type ReadRepository = Effect.Success<typeof makeReadRepository>;
export const makeReadRepository = readRepositoryFactory(RoomsContract.Table);
export const readRepositoryLayer = makeReadRepository.pipe(Layer.effect(RoomsReadRepository));

export type WriteRepository = Effect.Success<typeof makeWriteRepository>;
export const makeWriteRepository = RoomsReadRepository.pipe(
  Effect.flatMap((repository) => writeRepositoryFactory(RoomsContract.Table, repository)),
);
export const writeRepositoryLayer = makeWriteRepository.pipe(Layer.effect(RoomsWriteRepository));
