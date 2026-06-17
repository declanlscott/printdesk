import { Sha256 } from "@aws-crypto/sha256-js";
import { HttpRequest } from "@smithy/protocol-http";
import { SignatureV4 } from "@smithy/signature-v4";
import * as DateTime from "effect/DateTime";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import * as HttpClientError from "effect/unstable/http/HttpClientError";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";

import { SstResource } from "../../sst/resource";
import { AwsCredentialIdentity } from "../credential-identity";

import type {
  RequestPresigningArguments as SmithyRequestPresigningArguments,
  RequestSigningArguments as SmithyRequestSigningArguments,
} from "@smithy/types";
import type * as HttpBody from "effect/unstable/http/HttpBody";

export class SignatureV4Error extends Schema.TaggedErrorClass<SignatureV4Error>()(
  "SignatureV4Error",
  { cause: Schema.Defect() },
) {}

export class SigningError extends Schema.TaggedErrorClass<SigningError>()("SigningError", {
  service: Schema.NonEmptyString,
  cause: Schema.Defect(),
}) {}

export interface RequestPresigningArguments extends Omit<
  SmithyRequestPresigningArguments,
  "expiresIn" | "signingDate"
> {
  expiresIn?: Duration.Duration;
  signingDate?: DateTime.Utc;
  host?: string;
}

export interface RequestSigningArguments extends Omit<
  SmithyRequestSigningArguments,
  "signingDate"
> {
  signingDate?: DateTime.Utc;
  host?: string;
}

export const makeSigV4Signer = Effect.fn(function* (service: string) {
  const region = yield* SstResource.useSync((resource) =>
    resource.Aws.pipe(Redacted.value, Struct.get("region")),
  );

  const make = AwsCredentialIdentity.values.pipe(
    Effect.flatMap((credentials) =>
      Effect.try({
        try: () => new SignatureV4({ credentials, sha256: Sha256, region, service }),
        catch: (cause) => new SignatureV4Error({ cause }),
      }),
    ),
  );

  const matchBody = Match.typeTags<HttpBody.HttpBody>()({
    Empty: () => undefined,
    Raw: (body) => body.body,
    Uint8Array: (body) => body.body,
    FormData: (body) => body.formData,
    Stream: (body) => body.stream,
  });

  const presign = (...args: Parameters<SignatureV4["presign"]>) =>
    make.pipe(
      Effect.flatMap((sigv4) =>
        Effect.tryPromise({
          try: () => sigv4.presign(...args),
          catch: (cause) => new SigningError({ service, cause }),
        }),
      ),
    );

  const sign = (...args: Parameters<SignatureV4["sign"]>) =>
    make.pipe(
      Effect.flatMap((sigv4) =>
        Effect.tryPromise({
          try: () => sigv4.sign(...args),
          catch: (cause) => new SigningError({ service, cause }),
        }),
      ),
    );

  const presignRequest = Effect.fn(`${service}.presignRequest`)(function* (
    request: HttpClientRequest.HttpClientRequest,
    { host, ...args }: RequestPresigningArguments = {},
  ) {
    const { protocol, hostname, pathname: path } = new URL(request.url);

    const { headers, query } = yield* presign(
      new HttpRequest({
        method: request.method,
        protocol,
        hostname,
        path,
        headers: { ...request.headers, host: host ?? hostname },
        body: matchBody(request.body),
      }),
      {
        ...args,
        expiresIn: args.expiresIn?.pipe(Duration.toSeconds),
        signingDate: args.signingDate?.pipe(DateTime.toDateUtc),
      },
    ).pipe(Effect.mapError((cause) => new HttpClientError.EncodeError({ request, cause })));

    return request.pipe(
      HttpClientRequest.setHeaders(headers),
      HttpClientRequest.setUrlParams(query ?? {}),
    );
  });

  const signRequest = Effect.fn(`${service}.signRequest`)(function* (
    request: HttpClientRequest.HttpClientRequest,
    { host, ...args }: RequestSigningArguments = {},
  ) {
    const { protocol, hostname, pathname: path } = new URL(request.url);

    const { headers } = yield* sign(
      new HttpRequest({
        method: request.method,
        protocol,
        hostname,
        path,
        headers: { ...request.headers, host: host ?? hostname },
        body: matchBody(request.body),
      }),
      { ...args, signingDate: args.signingDate?.pipe(DateTime.toDateUtc) },
    ).pipe(Effect.mapError((cause) => new HttpClientError.EncodeError({ request, cause })));

    return request.pipe(HttpClientRequest.setHeaders(headers));
  });

  return { signRequest, presignRequest } as const;
});
