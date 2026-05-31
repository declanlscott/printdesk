import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { PapercutEvents } from ".";
import { EventsContract } from "../../../events/contract";
import { PapercutContract } from "../../contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.sync(() => {
  const syncResult = EventsContract.makeEvent(PapercutContract.syncResult, {
    handler: (_result) => Effect.void, // TODO
  });

  return { syncResult } as const;
});

export const layer = makeService.pipe(Layer.effect(PapercutEvents));
