import { formatUrl } from "@aws-sdk/util-format-url";
import { FetchHttpClient, HttpBody, HttpClient } from "@effect/platform";
import { HttpRequest } from "@smithy/protocol-http";
import * as Array from "effect/Array";
import * as Chunk from "effect/Chunk";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as Struct from "effect/Struct";

import { Auth } from "../auth2";
import { Signers } from "../aws2";
import { DataAccessProcedures } from "../data-access2/procedures";
import { Events } from "../events2";
import { Permissions } from "../permissions2";
import { Sst } from "../sst";
import { Utils } from "../utils";

import type { StartsWith } from "../utils/types";

export namespace Realtime {
  export class Realtime extends Effect.Service<Realtime>()(
    "@printdesk/core/realtime/Realtime",
    {
      dependencies: [
        Sst.Resource.layer,
        FetchHttpClient.layer,
        Permissions.Schemas.Default,
        DataAccessProcedures.Policies.Default,
      ],
      effect: Effect.gen(function* () {
        const maybeSession = yield* Effect.serviceOption(Auth.Session);
        const dns = yield* Sst.Resource.AppsyncEventApi.pipe(
          Effect.map(Struct.get("dns")),
        );
        const nameTemplate = yield* Sst.Resource.TenantDomains.pipe(
          Effect.map(Struct.get("realtime")),
          Effect.map(Struct.get("nameTemplate")),
        );
        const signer = yield* Signers.AppsyncSigner;
        const httpClient = yield* HttpClient.HttpClient;

        const encode = yield* Events.Event.pipe(Effect.map(Schema.encode));

        const url = maybeSession.pipe(
          Option.match({
            onSome: (session) =>
              Utils.buildName(nameTemplate, session.tenantId),
            onNone: () => dns.realtime,
          }),
          (hostname) =>
            formatUrl(
              new HttpRequest({
                protocol: "wss:",
                hostname,
                path: "/event/realtime",
              }),
            ),
          Effect.succeed,
          Effect.withSpan("Realtime.Realtime.url"),
        );

        const getAuth = Effect.fn("Realtime.Realtime.getAuth")(
          ({
            expiresIn,
            body,
          }: {
            expiresIn?: Duration.Duration;
            body: string;
          }) =>
            maybeSession.pipe(
              Option.match({
                onSome: (session) =>
                  Utils.buildName(nameTemplate, session.tenantId),
                onNone: () => dns.http,
              }),
              (hostname) =>
                new HttpRequest({
                  method: "POST",
                  protocol: "https:",
                  hostname,
                  path: "/event",
                  headers: {
                    accept: "application/json, text/javascript",
                    "content-encoding": "amz-1.0",
                    "content-type": "application/json; charset=UTF-8",
                    host: hostname,
                  },
                  body,
                }),
              (req) =>
                expiresIn
                  ? signer.presign(req, {
                      expiresIn: expiresIn.pipe(Duration.toSeconds),
                    })
                  : signer.sign(req),
              Effect.map(Struct.get("headers")),
            ),
        );

        const publish = Effect.fn("Realtime.Realtime.publish")(
          <TChannel extends string>({
            channel,
            events,
          }: {
            channel: StartsWith<"/", TChannel>;
            events: ReadonlyArray<Events.Event>;
          }) =>
            maybeSession.pipe(
              Option.match({
                onSome: (session) =>
                  Utils.buildName(nameTemplate, session.tenantId),
                onNone: () => dns.http,
              }),
              (hostname) =>
                Effect.all(
                  Array.map(events, (event) => encode(event)),
                  { concurrency: "unbounded" },
                ).pipe(
                  Effect.map(Stream.fromIterable),
                  Effect.map(Stream.grouped(5)),
                  Effect.map(Stream.map(Chunk.toArray)),
                  Effect.flatMap(
                    Stream.runForEach((events) =>
                      signer
                        .sign(
                          new HttpRequest({
                            method: "POST",
                            protocol: "https:",
                            hostname,
                            path: "/event",
                            headers: {
                              "content-type": "application/json",
                              host: hostname,
                            },
                            body: JSON.stringify({ channel, events }),
                          }),
                        )
                        .pipe(
                          Effect.flatMap((req) =>
                            httpClient.post(formatUrl(req), {
                              headers: req.headers,
                              body: HttpBody.raw(req.body),
                            }),
                          ),
                        ),
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
