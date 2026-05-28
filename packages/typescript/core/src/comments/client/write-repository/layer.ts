import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { CommentsWriteRepository } from ".";
import { makeWriteRepository } from "../../../database/client/write-repository";
import { CommentsContract } from "../../contract";
import { CommentsReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = CommentsReadRepository.pipe(
  Effect.flatMap((repository) => makeWriteRepository(CommentsContract.Table, repository)),
);

export const layer = makeService.pipe(Layer.effect(CommentsWriteRepository));
