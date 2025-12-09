import { Sha256 } from "@aws-crypto/sha256-js";
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { DsqlSigner } from "@effect-aws/dsql";
import * as HttpClientError from "@effect/platform/HttpClientError";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import { HttpRequest } from "@smithy/protocol-http";
import { SignatureV4 } from "@smithy/signature-v4";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as DateTime from "effect/DateTime";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Match from "effect/Match";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { Actors } from "../actors";
import { Sst } from "../sst";
import { buildName } from "../utils";

import type { CloudfrontSignInput } from "@aws-sdk/cloudfront-signer";
import type * as HttpBody from "@effect/platform/HttpBody";
import type {
  AwsCredentialIdentity,
  AwsCredentialIdentityProvider,
  RequestPresigningArguments as SmithyRequestPresigningArguments,
  RequestSigningArguments as SmithyRequestSigningArguments,
} from "@smithy/types";
import type { ColumnsContract } from "../columns/contract";

export namespace Credentials {
  export const buildRoleArn = (
    accountId: string,
    nameTemplate: string,
    tenantId: ColumnsContract.TenantId,
  ) => `arn:aws:iam::${accountId}:role/${buildName(nameTemplate, tenantId)}`;

  export class Credentials extends Context.Tag(
    "@printdesk/core/aws/Credentials",
  )<
    Credentials,
    {
      readonly accessKeyId: Redacted.Redacted<string>;
      readonly secretAccessKey: Redacted.Redacted<string>;
      readonly sessionToken: Redacted.Redacted<string | undefined>;
      readonly credentialScope: Redacted.Redacted<string | undefined>;
      readonly accountId: Redacted.Redacted<string | undefined>;
      readonly expiration: Redacted.Redacted<DateTime.Utc | undefined>;
    }
  >() {
    static readonly make = (identity: AwsCredentialIdentity) =>
      this.of({
        accessKeyId: Redacted.make(identity.accessKeyId),
        secretAccessKey: Redacted.make(identity.secretAccessKey),
        sessionToken: Redacted.make(identity.sessionToken),
        credentialScope: Redacted.make(identity.credentialScope),
        accountId: Redacted.make(identity.accountId),
        expiration: Redacted.make(
          identity.expiration !== undefined
            ? DateTime.unsafeMake(identity.expiration)
            : undefined,
        ),
      });

    static readonly layer = (identity: AwsCredentialIdentity) =>
      Layer.succeed(this, this.make(identity));

    static readonly providerLayer = (
      provider: () => AwsCredentialIdentityProvider,
    ) =>
      Layer.effect(
        this,
        Effect.promise(provider()).pipe(Effect.map(this.make)),
      );
  }

  export const fromChain = () =>
    Credentials.providerLayer(fromNodeProviderChain);

  export const values = Credentials.pipe(
    Effect.map((credentials) => ({
      accessKeyId: credentials.accessKeyId.pipe(Redacted.value),
      secretAccessKey: credentials.secretAccessKey.pipe(Redacted.value),
      sessionToken: credentials.sessionToken.pipe(Redacted.value),
      credentialScope: credentials.credentialScope.pipe(Redacted.value),
      accountId: credentials.accountId.pipe(Redacted.value),
      expiration: credentials.expiration.pipe(Redacted.value, (expiration) =>
        expiration?.pipe(DateTime.toDate),
      ),
    })),
  );
}

export namespace Signers {
  export namespace Cloudfront {
    export class SignerError extends Data.TaggedError("SignerError")<{
      readonly cause: unknown;
    }> {}

    export interface RequestSigningArguments extends Omit<
      CloudfrontSignInput,
      | "url"
      | "keyPairId"
      | "privateKey"
      | "dateLessThan"
      | "dateGreaterThan"
      | "policy"
    > {
      expiresIn: Duration.Duration;
    }

    export class Signer extends Effect.Service<Signer>()(
      "@printdesk/core/aws/CloudfrontSigner",
      {
        dependencies: [Sst.Resource.layer],
        effect: Effect.gen(function* () {
          const resource = yield* Sst.Resource;

          const keyPairId = resource.CloudfrontKeyGroup.pipe(Redacted.value).id;
          const privateKey = resource.CloudfrontPrivateKey.pipe(
            Redacted.value,
          ).pem;

          const signUrl = Effect.fn("CloudfrontSigner.signUrl")(
            (...args: Parameters<typeof getSignedUrl>) =>
              Effect.try({
                try: () => new URL(getSignedUrl(...args)),
                catch: (error) => new SignerError({ cause: error }),
              }),
          );

          const signRequest = Effect.fn("CloudfrontSigner.signRequest")(
            (
              request: HttpClientRequest.HttpClientRequest,
              { expiresIn, ...args }: RequestSigningArguments = {
                expiresIn: Duration.seconds(60),
              },
            ) =>
              signUrl({
                ...args,
                url: request.url,
                keyPairId,
                privateKey,
                dateLessThan: DateTime.unsafeNow().pipe(
                  DateTime.addDuration(expiresIn),
                  DateTime.toDateUtc,
                ),
              }).pipe(
                Effect.map((url) =>
                  request.pipe(HttpClientRequest.setUrl(url)),
                ),
              ),
          );

          return { signRequest } as const;
        }),
      },
    ) {}
  }

  export namespace Dsql {
    export const Signer = DsqlSigner;

    export const makeLayer = (
      { expiresIn }: { expiresIn?: Duration.Duration } = {
        expiresIn: Duration.minutes(15),
      },
    ) =>
      Layer.unwrapEffect(
        Effect.gen(function* () {
          const credentials = yield* Credentials.values;
          const dsqlCluster = yield* Sst.Resource.DsqlCluster.pipe(
            Effect.map(Redacted.value),
          );
          const aws = yield* Sst.Resource.Aws.pipe(Effect.map(Redacted.value));

          return DsqlSigner.layer({
            credentials,
            sha256: Sha256,
            hostname: dsqlCluster.host,
            region: aws.region,
            expiresIn: expiresIn?.pipe(Duration.toSeconds),
          });
        }),
      );

    export const layer = makeLayer();

    export const runtime = ManagedRuntime.make(
      layer.pipe(
        Layer.provide(Credentials.fromChain()),
        Layer.provideMerge(Sst.Resource.layer),
      ),
    );
  }

  export class SignatureV4Error extends Data.TaggedError("SignatureV4Error")<{
    readonly cause: unknown;
  }> {}

  export interface RequestPresigningArguments extends Omit<
    SmithyRequestPresigningArguments,
    "expiresIn" | "signingDate"
  > {
    expiresIn?: Duration.Duration;
    signingDate?: DateTime.Utc;
  }

  export interface RequestSigningArguments extends Omit<
    SmithyRequestSigningArguments,
    "signingDate"
  > {
    signingDate?: DateTime.Utc;
  }

  export const makeSignatureV4Signer = (service: string, host?: string) =>
    Effect.gen(function* () {
      const credentials = yield* Credentials.values;
      const region = yield* Sst.Resource.Aws.pipe(
        Effect.map(Redacted.value),
        Effect.map(Struct.get("region")),
      );

      const signatureV4 = yield* Effect.try({
        try: () =>
          new SignatureV4({
            credentials,
            sha256: Sha256,
            region,
            service,
          }),
        catch: (cause) => new SignatureV4Error({ cause }),
      });

      const matchBody = Match.type<HttpBody.HttpBody>().pipe(
        Match.tag("Empty", () => undefined),
        Match.tag("Raw", (body) => body.body),
        Match.tag("Uint8Array", (body) => body.body),
        Match.tag("FormData", (body) => body.formData),
        Match.tag("Stream", (body) => body.stream),
        Match.exhaustive,
      );

      const presign = (...args: Parameters<SignatureV4["presign"]>) =>
        Effect.tryPromise({
          try: () => signatureV4.presign(...args),
          catch: (cause) => new SignatureV4Error({ cause }),
        }).pipe(Effect.withSpan(`Signers.${service}.presign`));

      const sign = (...args: Parameters<SignatureV4["sign"]>) =>
        Effect.tryPromise({
          try: () => signatureV4.sign(...args),
          catch: (cause) => new SignatureV4Error({ cause }),
        }).pipe(Effect.withSpan(`Signers.${service}.sign`));

      const presignRequest = (
        request: HttpClientRequest.HttpClientRequest,
        args: RequestPresigningArguments = {},
      ) =>
        Effect.gen(function* () {
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
          ).pipe(
            Effect.mapError(
              (cause) =>
                new HttpClientError.RequestError({
                  reason: "Encode",
                  request,
                  cause,
                }),
            ),
          );

          return request.pipe(
            HttpClientRequest.setHeaders(headers),
            HttpClientRequest.setUrlParams(query ?? {}),
          );
        }).pipe(Effect.withSpan(`Signers.${service}.presignRequest`));

      const signRequest = (
        request: HttpClientRequest.HttpClientRequest,
        args: RequestSigningArguments = {},
      ) =>
        Effect.gen(function* () {
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
            {
              ...args,
              signingDate: args.signingDate?.pipe(DateTime.toDateUtc),
            },
          ).pipe(
            Effect.mapError(
              (cause) =>
                new HttpClientError.RequestError({
                  reason: "Encode",
                  request,
                  cause,
                }),
            ),
          );

          return request.pipe(HttpClientRequest.setHeaders(headers));
        }).pipe(Effect.withSpan(`Signers.${service}.signRequest`));

      return { signRequest, presignRequest } as const;
    });

  export class Appsync extends Effect.Service<Appsync>()(
    "@printdesk/core/aws/AppsyncSigner",
    {
      dependencies: [Sst.Resource.layer],
      effect: makeSignatureV4Signer("appsync"),
    },
  ) {}

  export class ExecuteApi extends Effect.Service<ExecuteApi>()(
    "@printdesk/core/aws/ExecuteApiSigner",
    {
      dependencies: [Sst.Resource.layer],
      effect: (host?: string) => makeSignatureV4Signer("execute-api", host),
    },
  ) {
    static readonly tenantLayer = Layer.unwrapEffect(
      Actors.Actor.pipe(
        Effect.flatMap(Struct.get("assertPrivate")),
        Effect.flatMap(({ tenantId }) =>
          Sst.Resource.TenantDomains.pipe(
            Effect.map(Redacted.value),
            Effect.map((hosts) => buildName(hosts.api.nameTemplate, tenantId)),
          ),
        ),
        Effect.map(this.Default),
      ),
    ).pipe(Layer.provide(Sst.Resource.layer));
  }
}
