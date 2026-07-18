import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import {
  SharedAccountGroupCustomerAccessReadRepository,
  SharedAccountGroupCustomerAccessWriteRepository,
} from ".";
import {
  readRepositoryFactory,
  writeRepositoryFactory,
} from "../../../../database/client/repositories";
import { SharedAccountGroupCustomerAccessContract } from "../../../contracts";

export type ReadRepository = Effect.Success<typeof makeReadRepository>;
export const makeReadRepository = readRepositoryFactory(
  SharedAccountGroupCustomerAccessContract.Table,
);
export const readRepositoryLayer = makeReadRepository.pipe(
  Layer.effect(SharedAccountGroupCustomerAccessReadRepository),
);

export type WriteRepository = Effect.Success<typeof makeWriteRepository>;
export const makeWriteRepository = SharedAccountGroupCustomerAccessReadRepository.pipe(
  Effect.flatMap((repository) =>
    writeRepositoryFactory(SharedAccountGroupCustomerAccessContract.Table, repository),
  ),
);
export const writeRepositoryLayer = makeWriteRepository.pipe(
  Layer.effect(SharedAccountGroupCustomerAccessWriteRepository),
);
