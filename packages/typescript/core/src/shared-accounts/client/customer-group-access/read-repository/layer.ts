import * as Layer from "effect/Layer";

import { SharedAccountCustomerGroupAccessReadRepository } from ".";
import { makeReadRepository } from "../../../../database/client/read-repository";
import { SharedAccountCustomerGroupAccessContract } from "../../../contracts";

import type * as Effect from "effect/Effect";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = makeReadRepository(SharedAccountCustomerGroupAccessContract.Table);

export const layer = makeService.pipe(Layer.effect(SharedAccountCustomerGroupAccessReadRepository));
