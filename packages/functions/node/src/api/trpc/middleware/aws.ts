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
import { isOfKind } from "~/api/trpc/meta";

export const appsyncSigner = t.middleware(async (opts) =>
  withAws(
    () => ({
      sigv4: {
        signers: {
          appsync: SignatureV4.buildSigner({
            region: Resource.Aws.region,
            service: "appsync",
            credentials:
              isOfKind(opts.meta, "aws-assume-role") && opts.meta.getInput
                ? Credentials.fromRoleChain([opts.meta.getInput()])
                : undefined,
          }),
        },
      },
    }),
    () => opts.next(opts),
  ),
);

export const dynamoDbDocumentClient = t.middleware(async (opts) =>
  withAws(
    () => ({
      dynamoDb: {
        documentClient: DynamoDb.DocumentClient.from(
          new DynamoDb.Client({
            credentials:
              isOfKind(opts.meta, "aws-assume-role") && opts.meta.getInput
                ? Credentials.fromRoleChain([opts.meta.getInput()])
                : undefined,
          }),
        ),
      },
    }),
    () => opts.next(opts),
  ),
);

export const executeApiSigner = t.middleware(async (opts) =>
  withAws(
    () => ({
      sigv4: {
        signers: {
          "execute-api": SignatureV4.buildSigner({
            region: Resource.Aws.region,
            service: "execute-api",
            credentials:
              isOfKind(opts.meta, "aws-assume-role") && opts.meta.getInput
                ? Credentials.fromRoleChain([opts.meta.getInput()])
                : undefined,
          }),
        },
      },
    }),
    () => opts.next(opts),
  ),
);

export const s3Client = t.middleware(async (opts) =>
  withAws(
    () => ({
      s3: {
        client: new S3.Client({
          credentials:
            isOfKind(opts.meta, "aws-assume-role") && opts.meta.getInput
              ? Credentials.fromRoleChain([opts.meta.getInput()])
              : undefined,
        }),
      },
    }),
    () => opts.next(opts),
  ),
);

export const ssmClient = t.middleware(async (opts) =>
  withAws(
    () => ({
      s3: {
        client: new S3.Client({
          credentials:
            isOfKind(opts.meta, "aws-assume-role") && opts.meta.getInput
              ? Credentials.fromRoleChain([opts.meta.getInput()])
              : undefined,
        }),
      },
    }),
    () => opts.next(opts),
  ),
);

export const sqsClient = t.middleware(async (opts) =>
  withAws(
    () => ({
      sqs: {
        client: new Sqs.Client({
          credentials:
            isOfKind(opts.meta, "aws-assume-role") && opts.meta.getInput
              ? Credentials.fromRoleChain([opts.meta.getInput()])
              : undefined,
        }),
      },
    }),
    () => opts.next(opts),
  ),
);
