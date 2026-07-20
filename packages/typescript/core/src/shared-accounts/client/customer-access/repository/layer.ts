import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { SharedAccountCustomerAccessRepository } from ".";
import { repositoryFactory } from "../../../../database/client/repository-factory";
import { SharedAccountCustomerAccessContract } from "../../../contracts";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = repositoryFactory(SharedAccountCustomerAccessContract.Table);

export const layer = makeService.pipe(Layer.effect(SharedAccountCustomerAccessRepository));
