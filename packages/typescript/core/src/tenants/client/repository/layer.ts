import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { TenantsRepository } from ".";
import { repositoryFactory } from "../../../database/client/repository-factory";
import { TenantsContract } from "../../contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = repositoryFactory(TenantsContract.Table);

export const layer = makeService.pipe(Layer.effect(TenantsRepository));
