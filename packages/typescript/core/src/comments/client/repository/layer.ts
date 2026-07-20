import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { CommentsRepository } from ".";
import { repositoryFactory } from "../../../database/client/repository-factory";
import { CommentsContract } from "../../contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = repositoryFactory(CommentsContract.Table);

export const layer = makeService.pipe(Layer.effect(CommentsRepository));
