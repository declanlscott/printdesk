import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { SharedAccountGroupCustomerAccessRepository } from ".";
import { repositoryFactory } from "../../../../database/client/repository-factory";
import { SharedAccountGroupCustomerAccessContract } from "../../../contracts";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = repositoryFactory(SharedAccountGroupCustomerAccessContract.Table);

export const layer = makeService.pipe(Layer.effect(SharedAccountGroupCustomerAccessRepository));
