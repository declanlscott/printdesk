import * as Array from "effect/Array";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Redacted from "effect/Redacted";
import * as Request from "effect/Request";
import * as RequestResolver from "effect/RequestResolver";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";

import { Actor } from "../actors";
import { AppsyncSigner } from "../aws/sigv4-signers/appsync";
import { SstResource } from "../sst/resource";
import { RealtimeContract } from "./contract";

import type * as Duration from "effect/Duration";
import type { AwsCredentialIdentity } from "../aws/credential-identity";
import type { TenantId } from "../utils";

export class PublishRequest extends Request.Class<
  { event: RealtimeContract.Event; tenantId: TenantId },
  void,
  PublishError,
  AwsCredentialIdentity
> {}

export class PublishError extends Schema.TaggedErrorClass<PublishError>()("PublishError", {
  cause: Schema.Defect(),
}) {}

export class Realtime extends Context.Service<Realtime>()("@printdesk/core/realtime/Realtime", {
  make: Effect.gen(function* () {
    const baseUrl = yield* SstResource.useSync((resource) =>
      resource.Hostnames.pipe(
        Redacted.value,
        Struct.get("realtime"),
        (hostname) => `https://${hostname}`,
      ),
    );
    const signer = yield* AppsyncSigner;
    const httpClient = yield* HttpClient.HttpClient;
    const path = yield* Path.Path;

    const getAuthorization = Effect.fn("Realtime.getAuthorization")(
      (payload: RealtimeContract.AuthorizationPayload, expiresIn?: Duration.Duration) =>
        HttpClientRequest.post(baseUrl).pipe(
          HttpClientRequest.appendUrl("/event"),
          HttpClientRequest.setHeaders({
            accept: "application/json, text/javascript",
            "content-encoding": "amz-1.0",
          }),
          HttpClientRequest.schemaBodyJson(RealtimeContract.AuthorizationPayload)(payload),
          Effect.flatMap((request) =>
            expiresIn ? signer.presignRequest(request, { expiresIn }) : signer.signRequest(request),
          ),
          Effect.map(Struct.get("headers")),
        ),
    );

    const publishResolver = Effect.context<AwsCredentialIdentity>().pipe(
      Effect.map((context) =>
        RequestResolver.makeGrouped<PublishRequest, RealtimeContract.Channel>({
          key: (entry) =>
            `/${path.join(entry.request.tenantId, entry.request.event.subchannel)}` as const,
          resolver: (entries, channel) =>
            HttpClientRequest.post(baseUrl).pipe(
              HttpClientRequest.appendUrl("/event"),
              HttpClientRequest.schemaBodyJson(RealtimeContract.PublishPayload)({
                channel,
                events: Array.map(entries, (entry) => entry.request.event.data),
              }),
              Effect.flatMap(signer.signRequest),
              Effect.flatMap(httpClient.execute),
              Effect.asVoid,
              Effect.provideContext(context),
              Effect.andThen((success) => Effect.forEach(entries, Request.succeed(success))),
              Effect.catchCause((cause) =>
                Effect.forEach(entries, Request.fail(new PublishError({ cause }))),
              ),
            ),
        }),
      ),
      Effect.map(RequestResolver.batchN(5)),
      Effect.map(RequestResolver.withSpan("Realtime.publishResolver")),
    );

    const publish = Effect.fn("Realtime.publish")((event: RealtimeContract.Event) =>
      Actor.use(Struct.get("tenantId")).pipe(
        Effect.flatMap((tenantId) =>
          Effect.request(new PublishRequest({ event, tenantId }), publishResolver),
        ),
      ),
    );

    return { getAuthorization, publish } as const;
  }),
}) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}
