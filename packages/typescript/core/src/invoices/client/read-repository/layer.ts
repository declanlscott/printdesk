import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { InvoicesReadRepository } from ".";
import { makeReadRepository } from "../../../database/client/read-repository";
import { InvoicesContract } from "../../contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = makeReadRepository(InvoicesContract.Table);

export const layer = makeService.pipe(Layer.effect(InvoicesReadRepository));
