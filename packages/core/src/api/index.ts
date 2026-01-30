import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { Actors } from "../actors";
import { CloudfrontSigner, ExecuteApiSigner } from "../aws";
import { Sst } from "../sst";
import { tenantTemplate } from "../utils";

export namespace Api {
  export class Tenant extends Effect.Service<Tenant>()(
    "@printdesk/core/api/Tenant",
    {
      accessors: true,
      dependencies: [
        Sst.Resource.Default,
        ExecuteApiSigner.Default,
        CloudfrontSigner.Default,
        FetchHttpClient.layer,
      ],
      effect: Effect.gen(function* () {
        const dnsTemplate = yield* Sst.Resource.TenantDomains.pipe(
          Effect.map(Redacted.value),
          Effect.map((domains) => domains.api.nameTemplate),
        );

        const baseClient = yield* HttpClient.HttpClient;

        const executeApiSigner = yield* ExecuteApiSigner;
        const cloudfrontSigner = yield* CloudfrontSigner;

        const client = Effect.gen(function* () {
          const host = yield* Actors.Actor.pipe(
            Effect.flatMap(Struct.get("assertPrivate")),
            Effect.map(({ tenantId }) => tenantTemplate(dnsTemplate, tenantId)),
          );

          return baseClient.pipe(
            HttpClient.mapRequest(
              HttpClientRequest.prependUrl(`https://${host}/api`),
            ),
            HttpClient.mapRequestEffect((req) =>
              executeApiSigner.signRequest(req, { host }),
            ),
            HttpClient.mapRequestEffect(cloudfrontSigner.signRequest),
            HttpClient.filterStatusOk,
          );
        });

        const execute = Effect.fn("Api.Tenant.execute")(
          (request: HttpClientRequest.HttpClientRequest) =>
            client.pipe(Effect.flatMap((client) => client.execute(request))),
        );

        return { execute } as const;
      }),
    },
  ) {}
}
