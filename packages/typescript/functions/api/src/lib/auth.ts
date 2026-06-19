import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { AwsCredentialIdentity } from "@printdesk/core/aws/credential-identity";
import { Openauth } from "@printdesk/core/oauth/openauth";
import { SstResource } from "@printdesk/core/sst/resource";
import { Constants } from "@printdesk/core/utils/constants";
import { AwsClient } from "aws4fetch";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

export const openauthLayer = Effect.gen(function* () {
  const { accessKeyId, secretAccessKey, sessionToken } = yield* AwsCredentialIdentity.values;
  const { Aws, Issuer } = yield* SstResource;

  const lambda = new AwsClient({
    accessKeyId,
    secretAccessKey,
    sessionToken,
    region: Aws.pipe(Redacted.value).region,
    service: "lambda",
    retries: 0,
  });

  return Openauth.Openauth.layer({
    clientID: Constants.OPENAUTH_CLIENT_IDS.API,
    fetch: (input) => lambda.fetch(input),
    issuer: Issuer.pipe(Redacted.value).url,
  });
}).pipe(
  Layer.unwrap,
  Layer.provide([AwsCredentialIdentity.providerLayer(fromNodeProviderChain), SstResource.layer]),
);
