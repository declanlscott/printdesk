import { Sha256 } from "@aws-crypto/sha256-js";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { DsqlSigner } from "@aws-sdk/dsql-signer";
import { SignatureV4 as _SignatureV4 } from "@smithy/signature-v4";
import { Effect } from "effect";

import { type PartialExcept } from "../utils/types";

import type { DsqlSignerConfig } from "@aws-sdk/dsql-signer";
import type { SignatureV4Init } from "@smithy/signature-v4";

export namespace Dsql {
  export class Signer extends Effect.Service<Signer>()(
    "@printdesk/core/aws/DsqlSigner",
    {
      effect: ({
        credentials = fromNodeProviderChain(),
        sha256 = Sha256,
        ...props
      }: DsqlSignerConfig) =>
        Effect.sync(() => new DsqlSigner({ credentials, sha256, ...props })),
    },
  ) {}
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
