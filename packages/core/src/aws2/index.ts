import { Sha256 } from "@aws-crypto/sha256-js";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { DsqlSigner as _DsqlSigner } from "@effect-aws/dsql";
import { SignatureV4 as _SignatureV4 } from "@smithy/signature-v4";
import { Duration, Effect, Layer, ManagedRuntime } from "effect";

import { Sst } from "../sst";

import type { SignatureV4Init } from "@smithy/signature-v4";
import type { PartialExcept } from "../utils/types";

export namespace DsqlSigner {
  export const Tag = _DsqlSigner;

  export const makeLayer = (
    { expiresIn }: { expiresIn?: Duration.Duration } = {
      expiresIn: Duration.minutes(15),
    },
  ) =>
    Layer.unwrapEffect(
      Effect.gen(function* () {
        const dsqlCluster = yield* Sst.Resource.DsqlCluster;
        const aws = yield* Sst.Resource.Aws;

        return _DsqlSigner.layer({
          credentials: fromNodeProviderChain(),
          sha256: Sha256,
          hostname: dsqlCluster.host,
          region: aws.region,
          expiresIn: expiresIn?.pipe(Duration.toSeconds),
        });
      }),
    ).pipe(Layer.provideMerge(Sst.Resource.layer));

  export const layer = makeLayer();

  export const runtime = ManagedRuntime.make(layer);
}

export namespace SignatureV4 {
  export class Signer extends Effect.Service<Signer>()(
    "@printdesk/core/aws/SignatureV4Signer",
    {
      effect: ({
        credentials = fromNodeProviderChain(),
        sha256 = Sha256,
        ...props
      }: PartialExcept<SignatureV4Init, "region" | "service">) =>
        Effect.sync(() => new _SignatureV4({ credentials, sha256, ...props })),
    },
  ) {}
}
