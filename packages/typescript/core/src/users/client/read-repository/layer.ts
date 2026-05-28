import * as Layer from "effect/Layer";

import { UsersReadRepository } from ".";
import { makeReadRepository } from "../../../database/client/read-repository";
import { UsersContract } from "../../contract";

import type * as Effect from "effect/Effect";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = makeReadRepository(UsersContract.Table);

export const layer = makeService.pipe(Layer.effect(UsersReadRepository));
