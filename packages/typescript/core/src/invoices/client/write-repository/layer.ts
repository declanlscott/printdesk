import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { InvoicesWriteRepository } from ".";
import { makeWriteRepository } from "../../../database/client/write-repository";
import { InvoicesContract } from "../../contract";
import { InvoicesReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = InvoicesReadRepository.pipe(
  Effect.flatMap((repository) => makeWriteRepository(InvoicesContract.Table, repository)),
);

export const layer = makeService.pipe(Layer.effect(InvoicesWriteRepository));
