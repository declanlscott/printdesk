import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import {
  SharedAccountCustomerAccessReadRepository,
  SharedAccountCustomerAccessWriteRepository,
} from ".";
import {
  readRepositoryFactory,
  writeRepositoryFactory,
} from "../../../../database/client/repositories";
import { SharedAccountCustomerAccessContract } from "../../../contracts";

export type ReadRepository = Effect.Success<typeof makeReadRepository>;
export const makeReadRepository = readRepositoryFactory(SharedAccountCustomerAccessContract.Table);
export const readRepositoryLayer = makeReadRepository.pipe(
  Layer.effect(SharedAccountCustomerAccessReadRepository),
);

export type WriteRepository = Effect.Success<typeof makeWriteRepository>;
export const makeWriteRepository = SharedAccountCustomerAccessReadRepository.pipe(
  Effect.flatMap((repository) =>
    writeRepositoryFactory(SharedAccountCustomerAccessContract.Table, repository),
  ),
);
export const writeRepositoryLayer = makeWriteRepository.pipe(
  Layer.effect(SharedAccountCustomerAccessWriteRepository),
);
