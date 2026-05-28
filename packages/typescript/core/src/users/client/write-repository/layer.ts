import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { UsersWriteRepository } from ".";
import { makeWriteRepository } from "../../../database/client/write-repository";
import { UsersContract } from "../../contract";
import { UsersReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = UsersReadRepository.pipe(
  Effect.flatMap((repository) => makeWriteRepository(UsersContract.Table, repository)),
);

export const layer = makeService.pipe(Layer.effect(UsersWriteRepository));
