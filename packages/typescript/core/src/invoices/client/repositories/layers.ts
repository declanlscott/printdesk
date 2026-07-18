import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { InvoicesReadRepository, InvoicesWriteRepository } from ".";
import {
  readRepositoryFactory,
  writeRepositoryFactory,
} from "../../../database/client/repositories";
import { InvoicesContract } from "../../contract";

export type ReadRepository = Effect.Success<typeof makeReadRepository>;
export const makeReadRepository = readRepositoryFactory(InvoicesContract.Table);
export const readRepositoryLayer = makeReadRepository.pipe(Layer.effect(InvoicesReadRepository));

export type WriteRepository = Effect.Success<typeof makeWriteRepository>;
export const makeWriteRepository = InvoicesReadRepository.pipe(
  Effect.flatMap((repository) => writeRepositoryFactory(InvoicesContract.Table, repository)),
);
export const writeRepositoryLayer = makeWriteRepository.pipe(Layer.effect(InvoicesWriteRepository));
