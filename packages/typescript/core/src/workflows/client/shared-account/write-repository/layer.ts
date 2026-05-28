import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { SharedAccountWorkflowsWriteRepository } from ".";
import { makeWriteRepository } from "../../../../database/client/write-repository";
import { SharedAccountWorkflowsContract } from "../../../contracts";
import { SharedAccountWorkflowsReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = SharedAccountWorkflowsReadRepository.pipe(
  Effect.flatMap((repository) =>
    makeWriteRepository(SharedAccountWorkflowsContract.Table, repository),
  ),
);

export const layer = makeService.pipe(Layer.effect(SharedAccountWorkflowsWriteRepository));
