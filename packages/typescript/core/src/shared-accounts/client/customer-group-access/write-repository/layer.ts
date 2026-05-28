import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { SharedAccountCustomerGroupAccessWriteRepository } from ".";
import { makeWriteRepository } from "../../../../database/client/write-repository";
import { SharedAccountCustomerGroupAccessContract } from "../../../contracts";
import { SharedAccountCustomerGroupAccessReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = SharedAccountCustomerGroupAccessReadRepository.pipe(
  Effect.flatMap((repository) =>
    makeWriteRepository(SharedAccountCustomerGroupAccessContract.Table, repository),
  ),
);

export const layer = makeService.pipe(
  Layer.effect(SharedAccountCustomerGroupAccessWriteRepository),
);
