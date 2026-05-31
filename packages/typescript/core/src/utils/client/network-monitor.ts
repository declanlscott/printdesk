import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Latch from "effect/Latch";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";

export interface NetworkMonitorConstructorOptions {
  initialOnline: boolean;
  addEventListener: (type: "online" | "offline", listener: () => void) => void;
  removeEventListener: (type: "online" | "offline", listener: () => void) => void;
}

export class NetworkMonitor extends Context.Service<NetworkMonitor>()(
  "@printdesk/core/utils/client/NetworkMonitor",
  {
    make: Effect.fn(function* (opts: NetworkMonitorConstructorOptions) {
      const onlineLatch = yield* Latch.make(opts.initialOnline);
      const onlineRef = yield* SubscriptionRef.make(opts.initialOnline);

      yield* Stream.callback<boolean>(
        Effect.fn(function* (queue) {
          const onlineListener = () => Queue.offer(queue, true);
          const offlineListener = () => Queue.offer(queue, false);

          opts.addEventListener("online", onlineListener);
          opts.addEventListener("offline", offlineListener);

          yield* Effect.addFinalizer(() =>
            Effect.sync(() => {
              opts.removeEventListener("online", onlineListener);
              opts.removeEventListener("offline", offlineListener);
            }),
          );
        }),
      ).pipe(
        Stream.tap((online) => (online ? onlineLatch.open : onlineLatch.close)),
        Stream.tap((online) => onlineRef.pipe(SubscriptionRef.set(online))),
        Stream.runDrain,
        Effect.forkDetach,
      );

      return { onlineLatch, onlineRef };
    }),
  },
) {
  public static readonly layer = (...args: Parameters<typeof this.make>) =>
    this.make(...args).pipe(Layer.effect(this));
}
