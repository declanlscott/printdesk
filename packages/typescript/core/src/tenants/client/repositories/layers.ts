import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { TenantsReadRepository, TenantsWriteRepository } from ".";
import {
  readRepositoryFactory,
  writeRepositoryFactory,
} from "../../../database/client/repositories";
import { TenantsContract } from "../../contract";

export type ReadRepository = Effect.Success<typeof makeReadRepository>;
export const makeReadRepository = readRepositoryFactory(TenantsContract.Table);
export const readRepositoryLayer = makeReadRepository.pipe(Layer.effect(TenantsReadRepository));

export type WriteRepository = Effect.Success<typeof makeWriteRepository>;
export const makeWriteRepository = TenantsReadRepository.pipe(
  Effect.flatMap((repository) => writeRepositoryFactory(TenantsContract.Table, repository)),
);
export const writeRepositoryLayer = makeWriteRepository.pipe(Layer.effect(TenantsWriteRepository));
