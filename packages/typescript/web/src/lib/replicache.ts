import { Actor } from "@printdesk/core/actors";
import { ReadTransaction } from "@printdesk/core/database/client/read-transaction";
import { Replicache as Service } from "@printdesk/core/replicache/client";
import * as Replicache from "@printdesk/core/replicache/client/layer";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as Atom from "effect/unstable/reactivity/Atom";

import { actorAtom } from "./actor";
import { ViteResource } from "./sst";

import type { Mutations } from "@printdesk/core/handlers/mutations";
import type { SubscribeOptions } from "replicache";

export const replicacheAtomRuntime = FetchHttpClient.layer.pipe(Atom.runtime);

export const replicacheAtom = replicacheAtomRuntime.atom((get) =>
  ViteResource.atom.pipe(
    get.result,
    Effect.flatMap(({ Environment, ReverseProxy }) =>
      Replicache.makeService({
        baseUrl: new URL(ReverseProxy.pipe(Redacted.value).urls.api),
        logLevel: Environment.pipe(Redacted.value).isDevMode ? "info" : "error",
      }),
    ),
    Effect.tap((replicache) =>
      Effect.addFinalizer(() =>
        replicache.close.pipe(
          Effect.catchTag("ReplicacheCloseError", (error) =>
            Effect.log("Encountered error closing replicache instance:", error.cause),
          ),
        ),
      ),
    ),
    Effect.provideService(Actor, Actor.of(get(actorAtom))),
  ),
);

export const replicacheLayer = Layer.effect(
  Service.Replicache,
  replicacheAtom.pipe(Atom.getResult),
);

export const queryAtomRuntime = Replicache.queryLayer.pipe(Atom.runtime);

export const makeQueryAtom = <
  TSuccess,
  TError,
  TServices extends Layer.Success<typeof Replicache.queryLayer>,
>(
  query: Effect.Effect<TSuccess, TError, TServices | ReadTransaction>,
  opts?: Omit<SubscribeOptions<TSuccess>, "isEqual">,
) =>
  queryAtomRuntime.atom((get) =>
    replicacheAtom.pipe(
      get.result,
      Effect.flatMap((replicache) =>
        replicache.query(query).pipe(
          Effect.tap(() =>
            replicache
              .subscribe(query, {
                ...opts,
                onData: (data) => {
                  opts?.onData(data);
                  get.setSelf(data);
                },
              })
              .pipe(Effect.map(get.addFinalizer)),
          ),
        ),
      ),
    ),
  );

export const makeMutationAtom = <TName extends keyof Mutations.Record>(name: TName) =>
  Atom.fn((args: Mutations.Record[TName]["Input"]["Type"], get) =>
    replicacheAtom.pipe(
      get.result,
      Effect.flatMap((replicache) => replicache.mutate(name, args)),
    ),
  );
