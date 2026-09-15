import * as Context from "effect/Context";

import type { AwsCredentialIdentity } from "../credential-identity";

export type S3CredentialsShape = AwsCredentialIdentity;

export class S3Credentials extends Context.Service<S3Credentials, S3CredentialsShape>()(
  "@printdesk/core/aws/S3Credentials",
) {}
