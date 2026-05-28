import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { SharedAccountCustomerAccessWriteRepository } from ".";
import { makeWriteRepository } from "../../../../database/client/write-repository";
import { SharedAccountCustomerAccessContract } from "../../../contracts";
import { SharedAccountCustomerAccessReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = SharedAccountCustomerAccessReadRepository.pipe(
  Effect.flatMap((repository) =>
    makeWriteRepository(SharedAccountCustomerAccessContract.Table, repository),
  ),
);

export const layer = makeService.pipe(Layer.effect(SharedAccountCustomerAccessWriteRepository));
