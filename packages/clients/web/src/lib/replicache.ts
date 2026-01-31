import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import { ApiContract } from "@printdesk/core/api/contract";
import { Procedures } from "@printdesk/core/procedures";
import { Replicache } from "@printdesk/core/replicache/client";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Redacted from "effect/Redacted";

import { ViteResource } from "./sst";

export const replicacheLayer = Effect.gen(function* () {
  const resource = yield* ViteResource;

  const logLevel = resource.AppData.pipe(Redacted.value).isDevMode
    ? "info"
    : "error";

  const baseUrl = new URL(
    `https://${resource.Domains.pipe(Redacted.value).api}`,
  );

  return yield* Replicache.make({ logLevel, baseUrl });
}).pipe(
  Layer.effect(Replicache.Replicache),
  Layer.provide(ViteResource.Default),
  Layer.provide(Procedures.Mutations.Default),
  Layer.provide(ApiContract.Application.Default),
  Layer.provide(FetchHttpClient.layer),
);

export const replicacheRuntime = replicacheLayer.pipe(ManagedRuntime.make);
