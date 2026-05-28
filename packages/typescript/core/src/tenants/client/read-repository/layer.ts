import * as Layer from "effect/Layer";

import { TenantsReadRepository } from ".";
import { makeReadRepository } from "../../../database/client/read-repository";
import { TenantsContract } from "../../contract";

import type * as Effect from "effect/Effect";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = makeReadRepository(TenantsContract.Table);

export const layer = makeService.pipe(Layer.effect(TenantsReadRepository));
