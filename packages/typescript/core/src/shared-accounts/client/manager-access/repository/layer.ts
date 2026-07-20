import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { SharedAccountManagerAccessRepository } from ".";
import { repositoryFactory } from "../../../../database/client/repository-factory";
import { SharedAccountManagerAccessContract } from "../../../contracts";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = repositoryFactory(SharedAccountManagerAccessContract.Table);

export const layer = makeService.pipe(Layer.effect(SharedAccountManagerAccessRepository));
