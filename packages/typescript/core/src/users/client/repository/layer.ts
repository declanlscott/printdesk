import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { UsersRepository } from ".";
import { repositoryFactory } from "../../../database/client/repository-factory";
import { UsersContract } from "../../contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = repositoryFactory(UsersContract.Table);

export const layer = makeService.pipe(Layer.effect(UsersRepository));
