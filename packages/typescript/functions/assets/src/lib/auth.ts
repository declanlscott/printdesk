import * as Openauth from "@printdesk/core/oauth/openauth/layer";
import { Constants } from "@printdesk/core/utils/constants";
import { AwsClient } from "aws4fetch";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

import { SstResource } from "./sst";

export const openauthLayer = Effect.gen(function* () {
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, Aws, Issuer } = yield* SstResource;

  const lambda = yield* Effect.sync(
    () =>
      new AwsClient({
        accessKeyId: AWS_ACCESS_KEY_ID.pipe(Redacted.value),
        secretAccessKey: AWS_SECRET_ACCESS_KEY.pipe(Redacted.value),
        region: Aws.pipe(Redacted.value).region,
        service: "lambda",
        retries: 0,
      }),
  );

  return Openauth.layer({
    clientID: Constants.OPENAUTH_CLIENT_IDS.ASSETS,
    fetch: (input) => lambda.fetch(input),
    issuer: Issuer.pipe(Redacted.value).url,
  });
}).pipe(Layer.unwrap, Layer.provide(SstResource.layer));
