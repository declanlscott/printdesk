import {
  Credentials,
  DynamoDb,
  S3,
  SignatureV4,
  Sqs,
  Ssm,
  withAws,
} from "@printworks/core/utils/aws";
import { createMiddleware } from "hono/factory";
import { Resource } from "sst";

import type { AssumeRoleCommandInput } from "@aws-sdk/client-sts";

type GetRoleInput = () => AssumeRoleCommandInput;

export const appsyncSigner = (getRoleInput?: GetRoleInput) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        sigv4: {
          signers: {
            appsync: SignatureV4.buildSigner({
              region: Resource.Aws.region,
              service: "appsync",
              credentials: getRoleInput
                ? Credentials.fromRoleChain([getRoleInput()])
                : undefined,
            }),
          },
        },
      },
      next,
    ),
  );

export const executeApiSigner = (getRoleInput?: GetRoleInput) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        sigv4: {
          signers: {
            "execute-api": SignatureV4.buildSigner({
              region: Resource.Aws.region,
              service: "execute-api",
              credentials: getRoleInput
                ? Credentials.fromRoleChain([getRoleInput()])
                : undefined,
            }),
          },
        },
      },
      next,
    ),
  );

export const dynamoDbDocumentClient = (getRoleInput?: GetRoleInput) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        dynamoDb: {
          documentClient: DynamoDb.DocumentClient.from(
            new DynamoDb.Client({
              credentials: getRoleInput
                ? Credentials.fromRoleChain([getRoleInput()])
                : undefined,
            }),
          ),
        },
      },
      next,
    ),
  );

export const s3Client = (getRoleInput?: GetRoleInput) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        s3: {
          client: new S3.Client({
            credentials: getRoleInput
              ? Credentials.fromRoleChain([getRoleInput()])
              : undefined,
          }),
        },
      },
      next,
    ),
  );

export const ssmClient = (getRoleInput?: GetRoleInput) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        ssm: {
          client: new Ssm.Client({
            credentials: getRoleInput
              ? Credentials.fromRoleChain([getRoleInput()])
              : undefined,
          }),
        },
      },
      next,
    ),
  );

export const sqsClient = (getRoleInput?: GetRoleInput) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        sqs: {
          client: new Sqs.Client({
            credentials: getRoleInput
              ? Credentials.fromRoleChain([getRoleInput()])
              : undefined,
          }),
        },
      },
      next,
    ),
  );
