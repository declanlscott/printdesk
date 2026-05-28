import * as Layer from "effect/Layer";

import { SharedAccountCustomerAccessReadRepository } from ".";
import { makeReadRepository } from "../../../../database/client/read-repository";
import { SharedAccountCustomerAccessContract } from "../../../contracts";

import type * as Effect from "effect/Effect";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = makeReadRepository(SharedAccountCustomerAccessContract.Table);

export const layer = makeService.pipe(Layer.effect(SharedAccountCustomerAccessReadRepository));
