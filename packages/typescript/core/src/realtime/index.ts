import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as Struct from "effect/Struct";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";

import { AppsyncSigner } from "../aws/sigv4-signers/appsync";
import { Events } from "../events";
import { SstResource } from "../sst/resource";
import { RealtimeContract } from "./contract";

import type * as Chunk from "effect/Chunk";
import type * as Duration from "effect/Duration";

class SubscribeSignedRequestBody extends Schema.Class<SubscribeSignedRequestBody>(
  "SubscribeSignedRequestBody",
)({ channel: RealtimeContract.Channel }) {}

class PublishSignedRequestBody extends Schema.Class<PublishSignedRequestBody>(
  "PublishSignedRequestBody",
)({ channel: RealtimeContract.Channel, events: Events.Event.pipe(Schema.Array) }) {}

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

    const getAuthorization = (channel: RealtimeContract.Channel, expiresIn?: Duration.Duration) =>
      HttpClientRequest.post(baseUrl).pipe(
        HttpClientRequest.appendUrl("/event"),
        HttpClientRequest.setHeaders({
          accept: "application/json, text/javascript",
          "content-encoding": "amz-1.0",
        }),
        HttpClientRequest.schemaBodyJson(SubscribeSignedRequestBody)({ channel }),
        Effect.flatMap((request) =>
          expiresIn ? signer.presignRequest(request, { expiresIn }) : signer.signRequest(request),
        ),
        Effect.map(Struct.get("headers")),
      );

    const publish = Effect.fn("Realtime.Realtime.publish")(
      (channel: RealtimeContract.Channel, events: Chunk.Chunk<Events.Event>) =>
        events.pipe(
          Stream.fromIterable,
          Stream.grouped(5),
          Stream.runForEach((events) =>
            HttpClientRequest.post(baseUrl).pipe(
              HttpClientRequest.appendUrl("/event"),
              HttpClientRequest.schemaBodyJson(PublishSignedRequestBody)({ channel, events }),
              Effect.flatMap(signer.signRequest),
              Effect.flatMap(httpClient.execute),
            ),
          ),
        ),
    );

    return { getAuthorization, publish } as const;
  }),
}) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}
