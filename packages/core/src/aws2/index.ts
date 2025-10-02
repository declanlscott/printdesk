import { Sha256 } from "@aws-crypto/sha256-js";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { DsqlSigner as _DsqlSigner } from "@effect-aws/dsql";
import { SignatureV4 } from "@smithy/signature-v4";
import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  ManagedRuntime,
  Redacted,
} from "effect";

import { Sst } from "../sst";

import type {
  AwsCredentialIdentity,
  AwsCredentialIdentityProvider,
} from "@smithy/types";

export namespace Credentials {
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

    static readonly layer = (provider: () => AwsCredentialIdentityProvider) =>
      Layer.effect(
        this,
        Effect.promise(provider()).pipe(Effect.map(this.make)),
      );
  }

  export const fromChain = () => Credentials.layer(fromNodeProviderChain);

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
  export namespace DsqlSigner {
    export const DsqlSigner = _DsqlSigner;

    export const makeLayer = (
      { expiresIn }: { expiresIn?: Duration.Duration } = {
        expiresIn: Duration.minutes(15),
      },
    ) =>
      Layer.unwrapEffect(
        Effect.gen(function* () {
          const credentials = yield* Credentials.values;
          const dsqlCluster = yield* Sst.Resource.DsqlCluster;
          const aws = yield* Sst.Resource.Aws;

          return _DsqlSigner.layer({
            credentials,
            sha256: Sha256,
            hostname: dsqlCluster.host,
            region: aws.region,
            expiresIn: expiresIn?.pipe(Duration.toSeconds),
          });
        }),
      ).pipe(Layer.provideMerge(Sst.Resource.layer));

    export const layer = makeLayer();

    export const runtime = ManagedRuntime.make(
      layer.pipe(Layer.provide(Credentials.fromChain())),
    );
  }

  export const makeSigv4Signer = (service: string) =>
    Effect.gen(function* () {
      const credentials = yield* Credentials.values;
      const aws = yield* Sst.Resource.Aws;

      const sigv4 = new SignatureV4({
        credentials,
        sha256: Sha256,
        region: aws.region,
        service,
      });

      return {
        presign: (...args: Parameters<SignatureV4["presign"]>) =>
          Effect.promise(() => sigv4.presign(...args)),
        sign: (...args: Parameters<SignatureV4["sign"]>) =>
          Effect.promise(() => sigv4.sign(...args)),
        signMessage: (...args: Parameters<SignatureV4["signMessage"]>) =>
          Effect.promise(() => sigv4.signMessage(...args)),
      } as const;
    });

  export class AppsyncSigner extends Effect.Service<AppsyncSigner>()(
    "@printdesk/core/aws/AppsyncSigner",
    { effect: makeSigv4Signer("appsync") },
  ) {}
}
