import { nodeCredentialIdentityProviderLayer } from "@printdesk/core/aws/credential-identity/node";
import * as Openauth from "@printdesk/core/oauth/openauth/issuer";
import { SstResource } from "@printdesk/core/sst/resource";
import { Constants } from "@printdesk/core/utils/constants";
import * as Layer from "effect/Layer";

export const openauthLayer = Openauth.issuerLayer(Constants.OPENAUTH_CLIENT_IDS.API).pipe(
  Layer.provide([nodeCredentialIdentityProviderLayer, SstResource.layer]),
);
