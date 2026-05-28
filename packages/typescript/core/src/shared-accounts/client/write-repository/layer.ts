import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { SharedAccountsWriteRepository } from ".";
import { makeWriteRepository } from "../../../database/client/write-repository";
import { SharedAccountsContract } from "../../contracts";
import { SharedAccountsReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = SharedAccountsReadRepository.pipe(
  Effect.flatMap((repository) => makeWriteRepository(SharedAccountsContract.Table, repository)),
);

export const layer = makeService.pipe(Layer.effect(SharedAccountsWriteRepository));
