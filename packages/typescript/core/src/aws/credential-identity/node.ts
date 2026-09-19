import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

import { AwsCredentialIdentityProvider } from "../../aws/credential-identity";

export const nodeCredentialIdentityProviderLayer =
  AwsCredentialIdentityProvider.layerFromProvider(fromNodeProviderChain);
