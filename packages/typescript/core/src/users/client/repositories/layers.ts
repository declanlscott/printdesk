import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { UsersReadRepository, UsersWriteRepository } from ".";
import {
  readRepositoryFactory,
  writeRepositoryFactory,
} from "../../../database/client/repositories";
import { UsersContract } from "../../contract";

export type ReadRepository = Effect.Success<typeof makeReadRepository>;
export const makeReadRepository = readRepositoryFactory(UsersContract.Table);
export const readRepositoryLayer = makeReadRepository.pipe(Layer.effect(UsersReadRepository));

export type WriteRepository = Effect.Success<typeof makeWriteRepository>;
export const makeWriteRepository = UsersReadRepository.pipe(
  Effect.flatMap((repository) => writeRepositoryFactory(UsersContract.Table, repository)),
);
export const writeRepositoryLayer = makeWriteRepository.pipe(Layer.effect(UsersWriteRepository));
