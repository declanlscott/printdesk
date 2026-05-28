import * as Layer from "effect/Layer";

import { ProductsReadRepository } from ".";
import { makeReadRepository } from "../../../database/client/read-repository";
import { ProductsContract } from "../../contract";

import type * as Effect from "effect/Effect";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = makeReadRepository(ProductsContract.Table);

export const layer = makeService.pipe(Layer.effect(ProductsReadRepository));
