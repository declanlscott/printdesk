import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { OrderObjectMetadataRepository } from ".";
import { repositoryFactory } from "../../../../database/client/repository-factory";
import { OrderObjectMetadataContract } from "../../../contracts";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = repositoryFactory(OrderObjectMetadataContract.Table);

export const layer = makeService.pipe(Layer.effect(OrderObjectMetadataRepository));
