/**
 * NOTE: This module provides server utility functions and must remain framework-agnostic.
 * For example it should not depend on sst for linked resources. Other modules in the
 * core package may depend on sst, but this module should not.
 */
import { Sha256 } from "@aws-crypto/sha256-js";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  SendMessageBatchCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import {
  DeleteParameterCommand,
  GetParameterCommand,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { getSignedUrl as _getSignedUrl } from "@aws-sdk/cloudfront-signer";
import {
  fromNodeProviderChain,
  fromTemporaryCredentials,
} from "@aws-sdk/credential-providers";
import { DsqlSigner } from "@aws-sdk/dsql-signer";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { formatUrl as _formatUrl } from "@aws-sdk/util-format-url";
import { SignatureV4 as _SignatureV4 } from "@smithy/signature-v4";
import * as R from "remeda";
import * as v from "valibot";

import { Utils } from ".";
import { ApplicationError } from "./errors";

import type {
  DeleteObjectCommandInput,
  GetObjectCommandInput,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import type {
  SendMessageBatchCommandInput,
  SendMessageCommandInput,
} from "@aws-sdk/client-sqs";
import type {
  DeleteParameterCommandInput,
  GetParameterCommandInput,
  PutParameterCommandInput,
} from "@aws-sdk/client-ssm";
import type { AssumeRoleCommandInput } from "@aws-sdk/client-sts";
import type { DsqlSignerConfig } from "@aws-sdk/dsql-signer";
import type { SignatureV4Init } from "@smithy/signature-v4";
import type { AwsCredentialIdentityProvider } from "@smithy/types";
import type { NonNullableProperties, PartialExcept } from "./types";

export type AwsContext = {
  dsql?: { signer: DsqlSigner };
  sqs?: { client: SQSClient };
  s3?: { client: S3Client };
  sigv4?: { signers: Record<string, _SignatureV4> };
  ssm?: { client: SSMClient };
};

const contextName = "Aws";
export const AwsContext = Utils.createContext<AwsContext>(contextName);

export function useAws<TServiceName extends keyof AwsContext>(
  serviceName: TServiceName,
) {
  const service = AwsContext.use()[serviceName];
  if (!service)
    throw new Error(`Missing "${serviceName}" service in aws context`);

  return service;
}

export async function withAws<
  TContext extends AwsContext,
  TCallback extends () => ReturnType<TCallback>,
>(context: TContext, callback: TCallback) {
  let old: AwsContext | undefined;
  try {
    old = AwsContext.use();
  } catch (e) {
    if (
      !(
        e instanceof ApplicationError.MissingContext &&
        e.contextName === contextName
      )
    )
      throw e;
  }

  if (old)
    return AwsContext.with(R.mergeDeep(old, context) as AwsContext, callback);

  return AwsContext.with(context, callback);
}

export namespace Cloudfront {
  export const getSignedUrl = (...args: Parameters<typeof _getSignedUrl>) =>
    new URL(_getSignedUrl(...args));
}

export namespace Credentials {
  export const buildRoleArn = (
    accountId: string,
    roleNameTemplate: string,
    tenantId: string,
  ) =>
    `arn:aws:iam::${accountId}:role/${Utils.buildName(roleNameTemplate, tenantId)}`;

  export function fromRoleChain(
    roleChainInputs: Array<AssumeRoleCommandInput>,
  ): AwsCredentialIdentityProvider {
    switch (roleChainInputs.length) {
      case 0:
        throw new Error("Empty role chain");
      case 1: // base case
        return fromTemporaryCredentials({ params: roleChainInputs[0] });
      default: // recursive case
        return fromTemporaryCredentials({
          masterCredentials: fromRoleChain(roleChainInputs.slice(1)),
          params: roleChainInputs[0],
        });
    }
  }
}

export namespace Dsql {
  export const buildSigner = ({
    credentials = fromNodeProviderChain(),
    sha256 = Sha256,
    ...props
  }: DsqlSignerConfig) => new DsqlSigner({ credentials, sha256, ...props });

  export const generateToken = () =>
    useAws("dsql").signer.getDbConnectAdminAuthToken();
}

export namespace S3 {
  type RequestPresigningArguments = Parameters<typeof getSignedUrl>[2];

  export const Client = S3Client;
  export type Client = S3Client;

  export const getSignedPutUrl = (
    input: NonNullableProperties<PutObjectCommandInput>,
    args?: RequestPresigningArguments,
  ) => getSignedUrl(useAws("s3").client, new PutObjectCommand(input), args);

  export const getSignedGetUrl = (
    input: NonNullableProperties<GetObjectCommandInput>,
    args?: RequestPresigningArguments,
  ) => getSignedUrl(useAws("s3").client, new GetObjectCommand(input), args);

  export const deleteObject = async (
    input: NonNullableProperties<DeleteObjectCommandInput>,
  ) => useAws("s3").client.send(new DeleteObjectCommand(input));
}

export namespace SignatureV4 {
  export const buildSigner = ({
    credentials = fromNodeProviderChain(),
    sha256 = Sha256,
    region,
    service,
  }: PartialExcept<SignatureV4Init, "region" | "service">) =>
    new _SignatureV4({ credentials, sha256, region, service });

  export const sign = (
    service: string,
    ...args: Parameters<_SignatureV4["sign"]>
  ) => useAws("sigv4").signers[service].sign(...args);
}

export namespace Sqs {
  export const Client = SQSClient;
  export type Client = SQSClient;

  export const sendMessage = async (
    input: NonNullableProperties<SendMessageCommandInput>,
  ) => useAws("sqs").client.send(new SendMessageCommand(input));

  export const sendMessageBatch = async (
    input: NonNullableProperties<SendMessageBatchCommandInput>,
  ) => useAws("sqs").client.send(new SendMessageBatchCommand(input));
}

export namespace Ssm {
  export const Client = SSMClient;
  export type Client = SSMClient;

  export const buildName = (...args: Parameters<typeof Utils.buildName>) =>
    v.parse(
      v.pipe(
        v.string(),
        v.transform(
          (name) => (name.startsWith("/") ? name : `/${name}`) as `/${string}`,
        ),
      ),
      Utils.buildName(...args),
    );

  export const putParameter = async (
    input: NonNullableProperties<PutParameterCommandInput>,
  ) => useAws("ssm").client.send(new PutParameterCommand(input));

  export const getParameter = async (
    input: NonNullableProperties<GetParameterCommandInput>,
  ) => useAws("ssm").client.send(new GetParameterCommand(input));

  export const deleteParameter = async (
    input: NonNullableProperties<DeleteParameterCommandInput>,
  ) => useAws("ssm").client.send(new DeleteParameterCommand(input));
}

export namespace Util {
  export const formatUrl = _formatUrl;
}
