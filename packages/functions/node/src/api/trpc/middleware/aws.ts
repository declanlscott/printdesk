import {
  Credentials,
  DynamoDb,
  S3,
  SignatureV4,
  Sqs,
  withAws,
} from "@printworks/core/utils/aws";
import { Resource } from "sst";

import { t } from "~/api/trpc";

import type { AssumeRoleCommandInput } from "@aws-sdk/client-sts";

type GetRoleInput = () => AssumeRoleCommandInput;

export const appsyncSigner = (getRoleInput?: GetRoleInput) =>
  t.middleware(async ({ next }) =>
    withAws(
      () => ({
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
      }),
      next,
    ),
  );

export const dynamoDbDocumentClient = (getRoleInput?: GetRoleInput) =>
  t.middleware(async ({ next }) =>
    withAws(
      () => ({
        dynamoDb: {
          documentClient: DynamoDb.DocumentClient.from(
            new DynamoDb.Client({
              credentials: getRoleInput
                ? Credentials.fromRoleChain([getRoleInput()])
                : undefined,
            }),
          ),
        },
      }),
      next,
    ),
  );

export const executeApiSigner = (getRoleInput?: GetRoleInput) =>
  t.middleware(async ({ next }) =>
    withAws(
      () => ({
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
      }),
      next,
    ),
  );

export const s3Client = (getRoleInput?: GetRoleInput) =>
  t.middleware(async ({ next }) =>
    withAws(
      () => ({
        s3: {
          client: new S3.Client({
            credentials: getRoleInput
              ? Credentials.fromRoleChain([getRoleInput()])
              : undefined,
          }),
        },
      }),
      next,
    ),
  );

export const ssmClient = (getRoleInput?: GetRoleInput) =>
  t.middleware(async ({ next }) =>
    withAws(
      () => ({
        s3: {
          client: new S3.Client({
            credentials: getRoleInput
              ? Credentials.fromRoleChain([getRoleInput()])
              : undefined,
          }),
        },
      }),
      next,
    ),
  );

export const sqsClient = (getRoleInput?: GetRoleInput) =>
  t.middleware(async ({ next }) =>
    withAws(
      () => ({
        sqs: {
          client: new Sqs.Client({
            credentials: getRoleInput
              ? Credentials.fromRoleChain([getRoleInput()])
              : undefined,
          }),
        },
      }),
      next,
    ),
  );
