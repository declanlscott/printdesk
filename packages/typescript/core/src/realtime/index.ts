import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Stream from "effect/Stream";
import * as Struct from "effect/Struct";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";

import { AppsyncSigner } from "../aws/sigv4-signers/appsync";
import { SstResource } from "../sst/resource";
import { RealtimeContract } from "./contract";

import type * as Chunk from "effect/Chunk";
import type * as Duration from "effect/Duration";

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

    const getAuthorization = (
      payload: RealtimeContract.AuthorizationPayload,
      expiresIn?: Duration.Duration,
    ) =>
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
      );

    const publish = Effect.fn("Realtime.Realtime.publish")(
      (channel: RealtimeContract.Channel, events: Chunk.Chunk<RealtimeContract.Event>) =>
        events.pipe(
          Stream.fromIterable,
          Stream.grouped(5),
          Stream.runForEach((events) =>
            HttpClientRequest.post(baseUrl).pipe(
              HttpClientRequest.appendUrl("/event"),
              HttpClientRequest.schemaBodyJson(RealtimeContract.PublishPayload)({
                channel,
                events,
              }),
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
