import { Sha256 } from "@aws-crypto/sha256-js";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { DsqlSigner } from "@aws-sdk/dsql-signer";
import { Effect } from "effect";

import type { DsqlSignerConfig } from "@aws-sdk/dsql-signer";

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
