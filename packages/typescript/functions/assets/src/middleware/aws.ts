import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import { AwsCredentialIdentityProviderMiddleware } from "@printdesk/core/api/middleware/aws";
import { R2CredentialIdentityProviderLayerMap } from "@printdesk/core/aws/credential-identity/r2";
import { CloudflareClient } from "@printdesk/core/cloudflare/client";
import * as Crypto from "@printdesk/core/crypto/layer";
import * as Layer from "effect/Layer";

import { assetsS3BucketLayer } from "../lib/assets";
import { cloudflareLayer, r2S3CredentialsLayer } from "../lib/cloudflare";
import { SstResource } from "../lib/sst";

export const r2CredentialIdentityProviderMiddlewareLayer =
  AwsCredentialIdentityProviderMiddleware.r2Layer.pipe(
    Layer.provide(R2CredentialIdentityProviderLayerMap.layer),
    Layer.provide([assetsS3BucketLayer, CloudflareClient.layer]),
    Layer.provide([cloudflareLayer, Crypto.layer, r2S3CredentialsLayer]),
    Layer.provide([NodeCrypto.layer, SstResource.layer]),
  );
