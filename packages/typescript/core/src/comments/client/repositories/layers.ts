import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { CommentsReadRepository, CommentsWriteRepository } from ".";
import {
  readRepositoryFactory,
  writeRepositoryFactory,
} from "../../../database/client/repositories";
import { CommentsContract } from "../../contract";

export type ReadRepository = Effect.Success<typeof makeReadRepository>;
export const makeReadRepository = readRepositoryFactory(CommentsContract.Table);
export const readRepositoryLayer = makeReadRepository.pipe(Layer.effect(CommentsReadRepository));

export type WriteRepository = Effect.Success<typeof makeWriteRepository>;
export const makeWriteRepository = CommentsReadRepository.pipe(
  Effect.flatMap((repository) => writeRepositoryFactory(CommentsContract.Table, repository)),
);
export const writeRepositoryLayer = makeWriteRepository.pipe(Layer.effect(CommentsWriteRepository));
