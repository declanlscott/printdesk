import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import {
  SharedAccountManagerAccessReadRepository,
  SharedAccountManagerAccessWriteRepository,
} from ".";
import {
  readRepositoryFactory,
  writeRepositoryFactory,
} from "../../../../database/client/repositories";
import { SharedAccountManagerAccessContract } from "../../../contracts";

export type ReadRepository = Effect.Success<typeof makeReadRepository>;
export const makeReadRepository = readRepositoryFactory(SharedAccountManagerAccessContract.Table);
export const readRepositoryLayer = makeReadRepository.pipe(
  Layer.effect(SharedAccountManagerAccessReadRepository),
);

export type WriteRepository = Effect.Success<typeof makeWriteRepository>;
export const makeWriteRepository = SharedAccountManagerAccessReadRepository.pipe(
  Effect.flatMap((repository) =>
    writeRepositoryFactory(SharedAccountManagerAccessContract.Table, repository),
  ),
);
export const writeRepositoryLayer = makeWriteRepository.pipe(
  Layer.effect(SharedAccountManagerAccessWriteRepository),
);
