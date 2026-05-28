import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { WorkflowStatusesWriteRepository } from ".";
import { makeWriteRepository } from "../../../../database/client/write-repository";
import { WorkflowStatusesContract } from "../../../contracts";
import { WorkflowStatusesReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = WorkflowStatusesReadRepository.pipe(
  Effect.flatMap((repository) => makeWriteRepository(WorkflowStatusesContract.Table, repository)),
);

export const layer = makeService.pipe(Layer.effect(WorkflowStatusesWriteRepository));
