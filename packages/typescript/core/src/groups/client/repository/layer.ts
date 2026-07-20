import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { GroupsRepository } from ".";
import { repositoryFactory } from "../../../database/client/repository-factory";
import { GroupsContract } from "../../contracts";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = repositoryFactory(GroupsContract.Table);

export const layer = makeService.pipe(Layer.effect(GroupsRepository));
