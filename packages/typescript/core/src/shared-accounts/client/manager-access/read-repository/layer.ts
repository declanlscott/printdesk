import * as Layer from "effect/Layer";

import { SharedAccountManagerAccessReadRepository } from ".";
import { makeReadRepository } from "../../../../database/client/read-repository";
import { SharedAccountManagerAccessContract } from "../../../contracts";

import type * as Effect from "effect/Effect";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = makeReadRepository(SharedAccountManagerAccessContract.Table);

export const layer = makeService.pipe(Layer.effect(SharedAccountManagerAccessReadRepository));
