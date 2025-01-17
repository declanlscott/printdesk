import {
  Credentials,
  S3,
  SignatureV4,
  Sqs,
  Ssm,
  withAws,
} from "@printworks/core/utils/aws";
import { createMiddleware } from "hono/factory";
import { Resource } from "sst";

import type { AssumeRoleCommandInput } from "@aws-sdk/client-sts";

type GetRole = () => Promise<AssumeRoleCommandInput> | AssumeRoleCommandInput;

export const appsyncSigner = (getRole?: GetRole) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        sigv4: {
          signers: {
            appsync: SignatureV4.buildSigner({
              region: Resource.Aws.region,
              service: "appsync",
              credentials: getRole
                ? Credentials.fromRoleChain([await getRole()])
                : undefined,
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

export const s3Client = (getRole?: GetRole) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        s3: {
          client: new S3.Client({
            credentials: getRole
              ? Credentials.fromRoleChain([await getRole()])
              : undefined,
          }),
        },
      },
      next,
    ),
  );

export const ssmClient = (getRole?: GetRole) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        ssm: {
          client: new Ssm.Client({
            credentials: getRole
              ? Credentials.fromRoleChain([await getRole()])
              : undefined,
          }),
        },
      },
      next,
    ),
  );

export const sqsClient = (getRole?: GetRole) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        sqs: {
          client: new Sqs.Client({
            credentials: getRole
              ? Credentials.fromRoleChain([await getRole()])
              : undefined,
          }),
        },
      },
      next,
    ),
  );
