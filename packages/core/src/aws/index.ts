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
import { tenantTemplate } from "../utils";
import { CredentialsContract } from "./contract";

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
  ) =>
    `arn:aws:iam::${accountId}:role/${tenantTemplate(nameTemplate, tenantId)}`;

  // @effect-leakable-service
  export class Identity extends Context.Tag(
    "@printdesk/core/aws/CredentialsIdentity",
  )<Identity, CredentialsContract.Identity>() {
    static readonly make = (identity: AwsCredentialIdentity) =>
      this.of({
        accessKeyId: Redacted.make(identity.accessKeyId),
        secretAccessKey: Redacted.make(identity.secretAccessKey),
        sessionToken: identity.sessionToken
          ? Redacted.make(identity.sessionToken)
          : undefined,
        credentialScope: identity.credentialScope
          ? Redacted.make(identity.credentialScope)
          : undefined,
        accountId: identity.accountId
          ? Redacted.make(identity.accessKeyId)
          : undefined,
        expiration: identity.expiration
          ? Redacted.make(DateTime.unsafeMake(identity.expiration))
          : undefined,
      });

    static readonly fromProvider = (
      provider: () => AwsCredentialIdentityProvider,
    ) =>
      Effect.tryPromise({
        try: () => provider()(),
        catch: (cause) => new CredentialsContract.ProviderError({ cause }),
      }).pipe(Effect.map(this.make));

    static readonly layer = (identity: AwsCredentialIdentity) =>
      Layer.succeed(this, this.make(identity));

    static readonly providerLayer = (
      provider: () => AwsCredentialIdentityProvider,
    ) => this.fromProvider(provider).pipe(Layer.effect(this));
  }

  export const values = Identity.pipe(
    Effect.map((credentials) => ({
      accessKeyId: credentials.accessKeyId.pipe(Redacted.value),
      secretAccessKey: credentials.secretAccessKey.pipe(Redacted.value),
      sessionToken: credentials.sessionToken?.pipe(Redacted.value),
      credentialScope: credentials.credentialScope?.pipe(Redacted.value),
      accountId: credentials.accountId?.pipe(Redacted.value),
      expiration: credentials.expiration?.pipe(Redacted.value, DateTime.toDate),
    })),
  ) satisfies Effect.Effect<AwsCredentialIdentity, never, Identity>;
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
        dependencies: [Sst.Resource.Default],
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
      }).pipe(Layer.unwrapEffect);

    export const layer = makeLayer();

    export const runtime = layer.pipe(
      Layer.provide(Credentials.Identity.providerLayer(fromNodeProviderChain)),
      Layer.provide(Sst.Resource.Default),
      ManagedRuntime.make,
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
      const region = yield* Sst.Resource.Aws.pipe(
        Effect.map(Redacted.value),
        Effect.map(Struct.get("region")),
      );

      const make = Credentials.values.pipe(
        Effect.flatMap((credentials) =>
          Effect.try({
            try: () =>
              new SignatureV4({
                credentials,
                sha256: Sha256,
                region,
                service,
              }),
            catch: (cause) => new SignatureV4Error({ cause }),
          }),
        ),
      );

      const matchBody = Match.type<HttpBody.HttpBody>().pipe(
        Match.tags({
          Empty: () => undefined,
          Raw: (body) => body.body,
          Uint8Array: (body) => body.body,
          FormData: (body) => body.formData,
          Stream: (body) => body.stream,
        }),
        Match.exhaustive,
      );

      const presign = (...args: Parameters<SignatureV4["presign"]>) =>
        make.pipe(
          Effect.flatMap((sigv4) =>
            Effect.tryPromise({
              try: () => sigv4.presign(...args),
              catch: (cause) => new SignatureV4Error({ cause }),
            }),
          ),
        );

      const sign = (...args: Parameters<SignatureV4["sign"]>) =>
        make.pipe(
          Effect.flatMap((sigv4) =>
            Effect.tryPromise({
              try: () => sigv4.sign(...args),
              catch: (cause) => new SignatureV4Error({ cause }),
            }),
          ),
        );

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
      accessors: true,
      dependencies: [Sst.Resource.Default],
      effect: makeSignatureV4Signer("appsync"),
    },
  ) {}

  export class ExecuteApi extends Effect.Service<ExecuteApi>()(
    "@printdesk/core/aws/ExecuteApiSigner",
    {
      accessors: true,
      dependencies: [Sst.Resource.Default],
      effect: (host?: string) => makeSignatureV4Signer("execute-api", host),
    },
  ) {
    static readonly tenantLayer = Actors.Actor.pipe(
      Effect.flatMap(Struct.get("assertPrivate")),
      Effect.flatMap(({ tenantId }) =>
        Sst.Resource.TenantDomains.pipe(
          Effect.map(Redacted.value),
          Effect.map((hosts) =>
            tenantTemplate(hosts.api.nameTemplate, tenantId),
          ),
        ),
      ),
      Effect.map(this.Default),
      Layer.unwrapEffect,
      Layer.provide(Sst.Resource.Default),
    );
  }
}
