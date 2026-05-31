import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { EventsDispatcher } from ".";
import { Events } from "../../../handlers/events";
import { PapercutEvents } from "../../../papercut/client/events";
import { ReplicacheEvents } from "../../../replicache/client/events";
import { EventsContract } from "../../contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const papercut = yield* PapercutEvents;
  const replicache = yield* ReplicacheEvents;

  return new EventsContract.Dispatcher({ handlerRegistry: Events.registry })
    .event(papercut.syncResult)
    .event(replicache.notification)
    .final();
});

export const layer = makeService.pipe(Layer.effect(EventsDispatcher));
