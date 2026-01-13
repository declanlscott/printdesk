import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as Struct from "effect/Struct";

import { Actors } from "../actors";
import { Signers } from "../aws";
import { Events } from "../events";
import { Procedures } from "../procedures";
import { Sst } from "../sst";
import { tenantTemplate } from "../utils";
import { RealtimeContract } from "./contract";

import type * as Chunk from "effect/Chunk";
import type * as Duration from "effect/Duration";

export namespace Realtime {
  export class Realtime extends Effect.Service<Realtime>()(
    "@printdesk/core/realtime/Realtime",
    {
      accessors: true,
      dependencies: [
        Sst.Resource.layer,
        Signers.Appsync.Default,
        FetchHttpClient.layer,
        Procedures.Policies.Default,
      ],
      effect: Effect.gen(function* () {
        const resource = yield* Sst.Resource;
        const signer = yield* Signers.Appsync;
        const httpClient = yield* HttpClient.HttpClient;

        const Event = yield* Events.Event;

        const maybePrivateActor = Actors.Actor.pipe(
          Effect.flatMap(Struct.get("assertPrivate")),
          Effect.map(Option.some),
          Effect.catchTag("InvalidActorError", () =>
            Option.none<
              Effect.Effect.Success<Actors.Actor["Type"]["assertPrivate"]>
            >().pipe(Effect.succeed),
          ),
        );
        const dns = resource.AppsyncEventApi.pipe(Redacted.value).dns;
        const tenantDnsTemplate = resource.TenantDomains.pipe(Redacted.value)
          .realtime.nameTemplate;

        const url = maybePrivateActor.pipe(
          Effect.map(
            Option.match({
              onSome: (privateActor) =>
                tenantTemplate(tenantDnsTemplate, privateActor.tenantId),
              onNone: () => dns.realtime,
            }),
          ),
          Effect.flatMap((domain) =>
            HttpClientRequest.get(`wss://${domain}`).pipe(
              HttpClientRequest.appendUrl("/event/realtime"),
              Struct.get("url"),
              Schema.decode(RealtimeContract.Url),
              Effect.withSpan("Realtime.Realtime.url"),
            ),
          ),
        );

        const getAuthorization = (
          channel?: RealtimeContract.Channel,
          expiresIn?: Duration.Duration,
        ) =>
          maybePrivateActor.pipe(
            Effect.map(
              Option.match({
                onSome: (actor) =>
                  tenantTemplate(tenantDnsTemplate, actor.tenantId),
                onNone: () => dns.http,
              }),
            ),
            Effect.flatMap((domain) =>
              HttpClientRequest.post(`https://${domain}`).pipe(
                HttpClientRequest.appendUrl("/event"),
                HttpClientRequest.setHeaders({
                  accept: "application/json, text/javascript",
                  "content-encoding": "amz-1.0",
                }),
                HttpClientRequest.schemaBodyJson(
                  Schema.Struct({
                    channel: RealtimeContract.Channel.pipe(Schema.optional),
                  }),
                )({ channel }),
                Effect.flatMap((request) =>
                  expiresIn
                    ? signer.presignRequest(request, { expiresIn })
                    : signer.signRequest(request),
                ),
                Effect.map(Struct.get("headers")),
              ),
            ),
          );

        const publish = Effect.fn("Realtime.Realtime.publish")(
          (
            channel: RealtimeContract.Channel,
            events: Chunk.Chunk<Events.Event>,
          ) =>
            maybePrivateActor.pipe(
              Effect.map(
                Option.match({
                  onSome: (privateActor) =>
                    tenantTemplate(tenantDnsTemplate, privateActor.tenantId),
                  onNone: () => dns.http,
                }),
              ),
              Effect.flatMap((domain) =>
                events.pipe(
                  Stream.fromChunk,
                  Stream.grouped(5),
                  Stream.runForEach((events) =>
                    HttpClientRequest.post(`https://${domain}`).pipe(
                      HttpClientRequest.appendUrl("/event"),
                      HttpClientRequest.schemaBodyJson(
                        Schema.Struct({
                          channel: RealtimeContract.Channel,
                          events: Schema.Chunk(Event),
                        }),
                      )({ channel, events }),
                      Effect.flatMap(signer.signRequest),
                      Effect.flatMap(httpClient.execute),
                    ),
                  ),
                ),
              ),
            ),
        );

        return { url, getAuthorization, publish } as const;
      }),
    },
  ) {}
}
