import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { OrderObjectsRepository } from ".";
import { repositoryFactory } from "../../../../database/client/repository-factory";
import { OrderObjectsContract } from "../../../contracts";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = repositoryFactory(OrderObjectsContract.Table);

export const layer = makeService.pipe(Layer.effect(OrderObjectsRepository));
