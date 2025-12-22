import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { Actors } from "../actors";
import { Signers } from "../aws";
import { Sst } from "../sst";
import { tenantTemplate } from "../utils";

export namespace Api {
  export class Http extends Effect.Service<Http>()("@printdesk/core/api/Http", {
    accessors: true,
    dependencies: [
      Sst.Resource.layer,
      Signers.ExecuteApi.tenantLayer,
      Signers.Cloudfront.Signer.Default,
      FetchHttpClient.layer,
    ],
    effect: Effect.gen(function* () {
      const { tenantId } = yield* Actors.Actor.pipe(
        Effect.flatMap(Struct.get("assertPrivate")),
      );
      const baseUrl = yield* Sst.Resource.TenantDomains.pipe(
        Effect.map(Redacted.value),
        Effect.map(
          (domains) =>
            `https://${tenantTemplate(domains.cdn.nameTemplate, tenantId)}/api`,
        ),
      );

      const executeSigner = yield* Signers.ExecuteApi;
      const cloudfrontSigner = yield* Signers.Cloudfront.Signer;

      const client = yield* HttpClient.HttpClient.pipe(
        Effect.map(
          HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl)),
        ),
        Effect.map(HttpClient.mapRequestEffect(executeSigner.signRequest)),
        Effect.map(HttpClient.mapRequestEffect(cloudfrontSigner.signRequest)),
        Effect.map(HttpClient.filterStatusOk),
      );

      return { client } as const;
    }),
  }) {}
}
