import { Sha256 } from "@aws-crypto/sha256-js";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { DsqlSigner } from "@aws-sdk/dsql-signer";
import { Effect, Layer } from "effect";

import type { DsqlSignerConfig } from "@aws-sdk/dsql-signer";

export namespace Dsql {
  const makeSigner = ({
    credentials = fromNodeProviderChain(),
    sha256 = Sha256,
    ...props
  }: DsqlSignerConfig) =>
    Effect.sync(() => new DsqlSigner({ credentials, sha256, ...props })).pipe(
      Effect.map((signer) => Dsql.Signer.of(signer)),
    );

  export class Signer extends Effect.Tag("@printdesk/core/aws/DsqlSigner")<
    Dsql.Signer,
    DsqlSigner
  >() {
    static live = (config: DsqlSignerConfig) =>
      Layer.effect(Dsql.Signer, makeSigner(config));
  }
}
