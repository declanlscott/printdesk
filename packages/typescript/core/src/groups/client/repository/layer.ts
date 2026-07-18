import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { GroupsReadRepository } from ".";
import { readRepositoryFactory } from "../../../database/client/repositories";
import { GroupsContract } from "../../contracts";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = readRepositoryFactory(GroupsContract.Table);

export const layer = makeService.pipe(Layer.effect(GroupsReadRepository));
