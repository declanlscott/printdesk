import {
  Credentials,
  DynamoDb,
  S3,
  SignatureV4,
  Sqs,
  Ssm,
} from "@printdesk/core/aws";
import { withAws } from "@printdesk/core/aws/context";
import { Resource } from "sst";

import { t } from "~/api/trpc";

import type { AssumeRoleCommandInput } from "@aws-sdk/client-sts";

export const appsyncSigner = (
  getRoleChain?: () => Array<AssumeRoleCommandInput>,
) =>
  t.middleware(async (opts) =>
    withAws(
      () => {
        const chain = getRoleChain?.();

        return {
          sigv4: {
            signers: {
              appsync: SignatureV4.buildSigner({
                region: Resource.Aws.region,
                service: "appsync",
                credentials: chain
                  ? Credentials.fromRoleChain(...chain)
                  : undefined,
              }),
            },
          },
        };
      },
      () => opts.next(opts),
    ),
  );

export const dynamoDbDocumentClient = (
  getRoleChain?: () => Array<AssumeRoleCommandInput>,
) =>
  t.middleware(async (opts) =>
    withAws(
      () => {
        const chain = getRoleChain?.();

        return {
          dynamoDb: {
            documentClient: DynamoDb.DocumentClient.from(
              new DynamoDb.Client({
                credentials: chain
                  ? Credentials.fromRoleChain(...chain)
                  : undefined,
              }),
            ),
          },
        };
      },
      () => opts.next(opts),
    ),
  );

export const executeApiSigner = (
  getRoleChain?: () => Array<AssumeRoleCommandInput>,
) =>
  t.middleware(async (opts) =>
    withAws(
      () => {
        const chain = getRoleChain?.();

        return {
          sigv4: {
            signers: {
              "execute-api": SignatureV4.buildSigner({
                region: Resource.Aws.region,
                service: "execute-api",
                credentials: chain
                  ? Credentials.fromRoleChain(...chain)
                  : undefined,
              }),
            },
          },
        };
      },
      () => opts.next(opts),
    ),
  );

export const s3Client = (getRoleChain?: () => Array<AssumeRoleCommandInput>) =>
  t.middleware(async (opts) =>
    withAws(
      () => {
        const chain = getRoleChain?.();

        return {
          s3: {
            client: new S3.Client({
              credentials: chain
                ? Credentials.fromRoleChain(...chain)
                : undefined,
            }),
          },
        };
      },
      () => opts.next(opts),
    ),
  );

export const ssmClient = (getRoleChain?: () => Array<AssumeRoleCommandInput>) =>
  t.middleware(async (opts) =>
    withAws(
      () => {
        const chain = getRoleChain?.();

        return {
          ssm: {
            client: new Ssm.Client({
              credentials: chain
                ? Credentials.fromRoleChain(...chain)
                : undefined,
            }),
          },
        };
      },
      () => opts.next(opts),
    ),
  );

export const sqsClient = (getRoleChain?: () => Array<AssumeRoleCommandInput>) =>
  t.middleware(async (opts) =>
    withAws(
      () => {
        const chain = getRoleChain?.();

        return {
          sqs: {
            client: new Sqs.Client({
              credentials: chain
                ? Credentials.fromRoleChain(...chain)
                : undefined,
            }),
          },
        };
      },
      () => opts.next(opts),
    ),
  );
