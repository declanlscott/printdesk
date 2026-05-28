import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { TenantsWriteRepository } from ".";
import { makeWriteRepository } from "../../../database/client/write-repository";
import { TenantsContract } from "../../contract";
import { TenantsReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = TenantsReadRepository.pipe(
  Effect.flatMap((repository) => makeWriteRepository(TenantsContract.Table, repository)),
);

export const layer = makeService.pipe(Layer.effect(TenantsWriteRepository));
