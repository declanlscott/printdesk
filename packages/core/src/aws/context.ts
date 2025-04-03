import { Utils } from "../utils";

import type { S3Client } from "@aws-sdk/client-s3";
import type { SQSClient } from "@aws-sdk/client-sqs";
import type { SSMClient } from "@aws-sdk/client-ssm";
import type { DsqlSigner } from "@aws-sdk/dsql-signer";
import type { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import type { SignatureV4 } from "@smithy/signature-v4";

export type AwsContext = {
  dsql?: { signer: DsqlSigner };
  dynamoDb?: { documentClient: DynamoDBDocument };
  sqs?: { client: SQSClient };
  s3?: { client: S3Client };
  sigv4?: { signers: Record<string, SignatureV4> };
  ssm?: { client: SSMClient };
};

export const AwsContext = Utils.createContext<AwsContext>("Aws");

export function useAws<TServiceName extends keyof AwsContext>(
  serviceName: TServiceName,
) {
  const service = AwsContext.use()[serviceName];
  if (!service)
    throw new Error(`Missing "${serviceName}" service in aws context`);

  return service;
}

export const withAws = <
  TGetContext extends () => AwsContext | Promise<AwsContext>,
  TCallback extends () => ReturnType<TCallback>,
>(
  getContext: TGetContext,
  callback: TCallback,
) => AwsContext.with(getContext, callback, { merge: true });
