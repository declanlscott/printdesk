import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { AnnouncementsReadRepository } from ".";
import { makeReadRepository } from "../../../database/client/read-repository";
import { AnnouncementsContract } from "../../contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = makeReadRepository(AnnouncementsContract.Table);

export const layer = makeService.pipe(Layer.effect(AnnouncementsReadRepository));
