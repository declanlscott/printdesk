import { Sha256 } from "@aws-crypto/sha256-js";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

import { DsqlSigner } from ".";
import { SstResource } from "../../../sst/resource";
import { AwsCredentialIdentity } from "../../credential-identity";

export const layer = Effect.fn(function* ({ expiresIn }: { expiresIn?: Duration.Duration }) {
  const credentials = yield* AwsCredentialIdentity.values;
  const resource = yield* SstResource;

  return DsqlSigner.layer({
    credentials,
    sha256: Sha256,
    hostname: resource.Dsql.pipe(Redacted.value).host,
    region: resource.Aws.pipe(Redacted.value).region,
    expiresIn: expiresIn?.pipe(Duration.toSeconds),
  });
}, Layer.unwrap);
