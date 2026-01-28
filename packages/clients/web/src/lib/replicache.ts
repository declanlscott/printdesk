import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import { ApiContract } from "@printdesk/core/api/contract";
import { Procedures } from "@printdesk/core/procedures";
import { Replicache } from "@printdesk/core/replicache/client";
import * as Effect from "effect/Effect";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Redacted from "effect/Redacted";

import { ViteResource } from "./sst";

export class ReplicacheClient extends Effect.Service<ReplicacheClient>()(
  "@printdesk/clients/web/replicache/Client",
  {
    accessors: true,
    dependencies: [
      ViteResource.Default,
      Procedures.Mutations.Default,
      ApiContract.Application.Default,
      FetchHttpClient.layer,
    ],
    effect: Effect.gen(function* () {
      const resource = yield* ViteResource;

      const logLevel = resource.AppData.pipe(Redacted.value).isDevMode
        ? "info"
        : "error";

      const baseUrl = new URL(
        `https://${resource.Domains.pipe(Redacted.value).api}`,
      );

      return yield* Replicache.makeClient({ logLevel, baseUrl });
    }),
  },
) {
  static readonly runtime = this.Default.pipe(ManagedRuntime.make);
}
