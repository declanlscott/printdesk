import {
  Credentials,
  S3,
  SignatureV4,
  Ssm,
  withAws,
} from "@printworks/core/utils/aws";
import { createMiddleware } from "hono/factory";
import { Resource } from "sst";

import type { AssumeRoleCommandInput } from "@aws-sdk/client-sts";

export const appsyncSigner = (role?: AssumeRoleCommandInput) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        sigv4: {
          signers: {
            appsync: SignatureV4.buildSigner({
              region: Resource.Aws.region,
              service: "appsync",
              credentials: role ? Credentials.fromRoleChain([role]) : undefined,
            }),
          },
        },
      },
      next,
    ),
  );

export const executeApiSigner = createMiddleware(async (_, next) =>
  withAws(
    {
      sigv4: {
        signers: {
          "execute-api": SignatureV4.buildSigner({
            region: Resource.Aws.region,
            service: "execute-api",
          }),
        },
      },
    },
    next,
  ),
);

export const s3Client = (role?: AssumeRoleCommandInput) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        s3: {
          client: new S3.Client({
            credentials: role ? Credentials.fromRoleChain([role]) : undefined,
          }),
        },
      },
      next,
    ),
  );

export const ssmClient = (role?: AssumeRoleCommandInput) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        ssm: {
          client: new Ssm.Client({
            credentials: role ? Credentials.fromRoleChain([role]) : undefined,
          }),
        },
      },
      next,
    ),
  );
