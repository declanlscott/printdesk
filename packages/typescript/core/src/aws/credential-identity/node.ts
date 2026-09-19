import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

import { AwsCredentialIdentityProvider } from ".";

export const nodeCredentialIdentityProviderLayer =
  AwsCredentialIdentityProvider.layerFromProvider(fromNodeProviderChain);
