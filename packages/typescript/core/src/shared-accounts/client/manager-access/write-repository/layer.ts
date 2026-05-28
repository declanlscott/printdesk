import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { SharedAccountManagerAccessWriteRepository } from ".";
import { makeWriteRepository } from "../../../../database/client/write-repository";
import { SharedAccountManagerAccessContract } from "../../../contracts";
import { SharedAccountManagerAccessReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = SharedAccountManagerAccessReadRepository.pipe(
  Effect.flatMap((repository) =>
    makeWriteRepository(SharedAccountManagerAccessContract.Table, repository),
  ),
);

export const layer = makeService.pipe(Layer.effect(SharedAccountManagerAccessWriteRepository));
