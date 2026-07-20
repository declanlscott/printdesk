import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { RoomsRepository } from ".";
import { repositoryFactory } from "../../../database/client/repository-factory";
import { RoomsContract } from "../../contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = repositoryFactory(RoomsContract.Table);

export const layer = makeService.pipe(Layer.effect(RoomsRepository));
