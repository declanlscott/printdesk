import { Constants } from "@printdesk/core/utils/constants";
import * as Cause from "effect/Cause";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Match from "effect/Match";
import * as Redacted from "effect/Redacted";
import * as Result from "effect/Result";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { proxy } from "hono/proxy";

import { resource } from "../lib/sst";

const url =
  resource.PROTOCOL.pipe(Redacted.value) +
  "://" +
  resource.HOSTNAME.pipe(Redacted.value) +
  ":" +
  resource.PORT.pipe(Redacted.value) +
  Constants.PAPERCUT_API_PATH;

const customFetch = resource.PAPERCUT_API.pipe(Redacted.value).fetch;

export const papercutApi = createMiddleware((c) =>
  Effect.tryPromise((signal) => proxy(url, { raw: c.req.raw, signal, customFetch }))
    .pipe(Effect.timeout(Duration.seconds(10)), Effect.runPromiseExit)
    .then(
      Exit.match({
        onSuccess: (response) => response,
        onFailure: (cause) => {
          throw cause.pipe(
            Cause.findError,
            Result.match({
              onSuccess: (error) =>
                Match.valueTags(error, {
                  TimeoutError: (error) => new HTTPException(504, { cause: error.cause }),
                  UnknownError: (error) => new HTTPException(500, { cause: error.cause }),
                }),
              onFailure: (cause) => new HTTPException(500, { cause }),
            }),
          );
        },
      }),
    ),
);
