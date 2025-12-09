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
import { buildName } from "../utils";

import type * as Chunk from "effect/Chunk";
import type * as Duration from "effect/Duration";
import type { ActorsContract } from "../actors/contract";
import type { RealtimeContract } from "./contract";

export namespace Realtime {
  export class Realtime extends Effect.Service<Realtime>()(
    "@printdesk/core/realtime/Realtime",
    {
      dependencies: [
        Sst.Resource.layer,
        Signers.Appsync.Default,
        FetchHttpClient.layer,
        Procedures.Policies.Default,
      ],
      effect: Effect.gen(function* () {
        const resource = yield* Sst.Resource;

        const maybePrivateActor = (yield* Actors.Actor.pipe(
          Effect.flatMap(Struct.get("assertPrivate")),
          Effect.map(Option.some),
          Effect.catchTag("InvalidActorError", () => Effect.succeedNone),
        )) as Option.Option<ActorsContract.System | ActorsContract.User>;
        const signer = yield* Signers.Appsync;
        const httpClient = yield* HttpClient.HttpClient;

        const Event = yield* Events.Event;

        const dns = resource.AppsyncEventApi.pipe(Redacted.value).dns;
        const nameTemplate = resource.TenantDomains.pipe(Redacted.value)
          .realtime.nameTemplate;

        const url = maybePrivateActor.pipe(
          Option.match({
            onSome: (privateActor) =>
              buildName(nameTemplate, privateActor.tenantId),
            onNone: () => dns.realtime,
          }),
          (domain) =>
            HttpClientRequest.get(`wss://${domain}`).pipe(
              HttpClientRequest.appendUrl("/event/realtime"),
              Struct.get("url"),
              Effect.succeed,
              Effect.withSpan("Realtime.Realtime.url"),
            ),
        );

        const getAuth = <TChannel extends string>(
          channel?: RealtimeContract.Channel<TChannel>,
          expiresIn?: Duration.Duration,
        ) =>
          maybePrivateActor.pipe(
            Option.match({
              onSome: (actor) => buildName(nameTemplate, actor.tenantId),
              onNone: () => dns.http,
            }),
            (domain) =>
              HttpClientRequest.post(`https://${domain}`).pipe(
                HttpClientRequest.appendUrl("/event"),
                HttpClientRequest.setHeaders({
                  accept: "application/json, text/javascript",
                  "content-encoding": "amz-1.0",
                }),
                HttpClientRequest.schemaBodyJson(
                  Schema.Struct({
                    channel: Schema.String.pipe(
                      Schema.startsWith("/"),
                      Schema.optional,
                    ),
                  }),
                )({ channel }),
                Effect.flatMap((request) =>
                  expiresIn
                    ? signer.presignRequest(request, { expiresIn })
                    : signer.signRequest(request),
                ),
                Effect.map(Struct.get("headers")),
              ),
          );

        const publish = Effect.fn("Realtime.Realtime.publish")(
          <TChannel extends string>(
            channel: RealtimeContract.Channel<TChannel>,
            events: Chunk.Chunk<Events.Event>,
          ) =>
            maybePrivateActor.pipe(
              Option.match({
                onSome: (privateActor) =>
                  buildName(nameTemplate, privateActor.tenantId),
                onNone: () => dns.http,
              }),
              (domain) =>
                Stream.fromChunk(events).pipe(
                  Stream.grouped(5),
                  Stream.runForEach((events) =>
                    HttpClientRequest.post(`https://${domain}`).pipe(
                      HttpClientRequest.appendUrl("/event"),
                      HttpClientRequest.schemaBodyJson(
                        Schema.Struct({
                          channel: Schema.String.pipe(Schema.startsWith("/")),
                          events: Schema.Chunk(Event),
                        }),
                      )({ channel, events }),
                      Effect.flatMap(signer.signRequest),
                      Effect.flatMap(httpClient.execute),
                    ),
                  ),
                ),
            ),
        );

        return { url, getAuth, publish } as const;
      }),
    },
  ) {}
}
