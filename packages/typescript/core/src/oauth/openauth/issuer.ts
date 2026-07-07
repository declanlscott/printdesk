import { AwsClient } from "aws4fetch";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { AwsCredentialIdentityProvider } from "../../aws/credential-identity";
import { SstResource } from "../../sst/resource";
import { layer } from "./layer";

import type { Constants } from "../../utils/constants";

export const issuerLayer = Effect.fn(
  function* (clientId: Constants.OpenauthClientId) {
    const { accessKeyId, secretAccessKey, sessionToken } =
      yield* AwsCredentialIdentityProvider.pipe(Effect.map(Struct.get("credentials")));

    const { Aws, Issuer } = yield* SstResource;

    const lambda = new AwsClient({
      accessKeyId: accessKeyId.pipe(Redacted.value),
      secretAccessKey: secretAccessKey.pipe(Redacted.value),
      sessionToken: sessionToken?.pipe(Redacted.value),
      region: Aws.pipe(Redacted.value).region,
      service: "lambda",
      retries: 0,
    });

    return layer({
      clientID: clientId,
      fetch: (input) => lambda.fetch(input),
      issuer: Issuer.pipe(Redacted.value).url,
    });
  },
  (effect) => effect.pipe(Layer.unwrap),
);
