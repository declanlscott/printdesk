import * as Layer from "effect/Layer";

import { RoomWorkflowsReadRepository } from ".";
import { makeReadRepository } from "../../../../database/client/read-repository";
import { RoomWorkflowsContract } from "../../../contracts";

import type * as Effect from "effect/Effect";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = makeReadRepository(RoomWorkflowsContract.Table);

export const layer = makeService.pipe(Layer.effect(RoomWorkflowsReadRepository));
