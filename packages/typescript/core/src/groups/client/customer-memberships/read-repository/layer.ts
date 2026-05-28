import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { CustomerGroupMembershipsReadRepository } from ".";
import { makeReadRepository } from "../../../../database/client/read-repository";
import { CustomerGroupMembershipsContract } from "../../../contracts";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = makeReadRepository(CustomerGroupMembershipsContract.Table);

export const layer = makeService.pipe(Layer.effect(CustomerGroupMembershipsReadRepository));
