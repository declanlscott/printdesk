import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as _HttpClient from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { Actors } from "../actors";
import { Signers } from "../aws";
import { Sst } from "../sst";
import { tenantTemplate } from "../utils";

export namespace Api {
  export class HttpClient extends Effect.Service<HttpClient>()(
    "@printdesk/core/api/HttpClient",
    {
      accessors: true,
      dependencies: [
        Sst.Resource.Default,
        Signers.ExecuteApi.Default,
        Signers.Cloudfront.Signer.Default,
        FetchHttpClient.layer,
      ],
      effect: Effect.gen(function* () {
        const dnsTemplate = yield* Sst.Resource.TenantDomains.pipe(
          Effect.map(Redacted.value),
          Effect.map((domains) => domains.api.nameTemplate),
        );

        const baseClient = yield* _HttpClient.HttpClient;

        const executeApiSigner = yield* Signers.ExecuteApi;
        const cloudfrontSigner = yield* Signers.Cloudfront.Signer;

        const client = Effect.gen(function* () {
          const host = yield* Actors.Actor.pipe(
            Effect.flatMap(Struct.get("assertPrivate")),
            Effect.map(({ tenantId }) => tenantTemplate(dnsTemplate, tenantId)),
          );

          return baseClient.pipe(
            _HttpClient.mapRequest(
              HttpClientRequest.prependUrl(`https://${host}/api`),
            ),
            _HttpClient.mapRequestEffect((req) =>
              executeApiSigner.signRequest(req, { host }),
            ),
            _HttpClient.mapRequestEffect(cloudfrontSigner.signRequest),
            _HttpClient.filterStatusOk,
          );
        });

        const execute = Effect.fn("Api.HttpClient.execute")(
          (request: HttpClientRequest.HttpClientRequest) =>
            client.pipe(Effect.flatMap((client) => client.execute(request))),
        );

        return { execute } as const;
      }),
    },
  ) {}
}
