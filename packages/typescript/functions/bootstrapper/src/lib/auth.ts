import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { AwsCredentialIdentityProvider } from "@printdesk/core/aws/credential-identity";
import { Config } from "@printdesk/core/config";
import { Oauth } from "@printdesk/core/oauth";
import { Openauth } from "@printdesk/core/oauth/openauth";
import { issuerLayer } from "@printdesk/core/oauth/openauth/issuer";
import { SstResource } from "@printdesk/core/sst/resource";
import { Constants } from "@printdesk/core/utils/constants";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Struct from "effect/Struct";

export const openauthLayer = issuerLayer(Constants.OPENAUTH_CLIENT_IDS.PROVISIONER).pipe(
  Layer.provide([
    AwsCredentialIdentityProvider.providerLayer(fromNodeProviderChain),
    SstResource.layer,
  ]),
);

export const papercutSyncClientAccessTokenLayer = Config.use(
  Struct.get("getPapercutMfSyncClientCredentials"),
).pipe(
  Effect.flatMap((credentials) =>
    Openauth.use((openauth) => openauth.clientCredentials(credentials)),
  ),
  Effect.map(({ tokens }) => Oauth.AccessTokenLayerMap.get(tokens.access)),
  Layer.unwrap,
);
