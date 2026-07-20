import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { InvoicesRepository } from ".";
import { repositoryFactory } from "../../../database/client/repository-factory";
import { InvoicesContract } from "../../contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = repositoryFactory(InvoicesContract.Table);

export const layer = makeService.pipe(Layer.effect(InvoicesRepository));
