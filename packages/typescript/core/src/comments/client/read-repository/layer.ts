import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { CommentsReadRepository } from ".";
import { makeReadRepository } from "../../../database/client/read-repository";
import { CommentsContract } from "../../contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = makeReadRepository(CommentsContract.Table);

export const layer = makeService.pipe(Layer.effect(CommentsReadRepository));
