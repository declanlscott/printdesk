import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";

import { RealtimeContract } from "./contract";

// import type { WebSocketOptionsProtocolsOrProtocol } from "bun";

export namespace Realtime {
  export class WebSocketUrlProvider extends Effect.Service<WebSocketUrlProvider>()(
    "@printdesk/core/realtime/client/WebSocketUrlProvider",
    {
      accessors: true,
      dependencies: [],
      effect: Effect.gen(function* () {
        //
      }),
    },
  ) {}

  export class WebSocketProtocolsProvider extends Effect.Service<WebSocketProtocolsProvider>()(
    "@printdesk/core/realtime/client/WebSocketProtocolsProvider",
    {
      accessors: true,
      dependencies: [],
      effect: Effect.gen(function* () {
        //
      }),
    },
  ) {}

  export class Subscriptions extends Effect.Service<Subscriptions>()(
    "@printdesk/core/realtime/client/Subscriptions",
    {
      accessors: true,
      dependencies: [],
      effect: Effect.gen(function* () {
        yield* Effect.void;

        const initialize = Effect.gen(function* () {
          // const url = yield* urlProvider;
          // const protocols = yield* protocolsProvider;
        });

        return { initialize } as const;
      }),
      // effect: Effect.gen(function* () {
      //   yield* Effect.void;

      //   const setup = Effect.gen(function* () {
      //     const websocket = new WebSocket("");

      //     yield* Effect.addFinalizer(() =>
      //       Effect.sync(() => websocket.close()),
      //     );

      //     websocket.onopen = () =>
      //       websocket.send(
      //         Schema.encodeSync(
      //           Schema.parseJson(RealtimeContract.ConnectionInit),
      //         )(new RealtimeContract.ConnectionInit()),
      //       );
      //   });

      //   return { setup } as const;
      // }),
    },
  ) {}
}
