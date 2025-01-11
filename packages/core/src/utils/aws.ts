/**
 * NOTE: This module provides server utility functions and must remain framework-agnostic.
 * For example it should not depend on sst for linked resources. Other modules in the
 * core package may depend on sst, but this module should not.
 */
import { Sha256 } from "@aws-crypto/sha256-js";
import {
  AppSyncClient,
  CreateApiCommand,
  CreateChannelNamespaceCommand,
  DeleteApiCommand,
  DeleteChannelNamespaceCommand,
  GetApiCommand,
  GetChannelNamespaceCommand,
  UpdateApiCommand,
  UpdateChannelNamespaceCommand,
} from "@aws-sdk/client-appsync";
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
  ParameterNotFound,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";
import { getSignedUrl as _getSignedUrl } from "@aws-sdk/cloudfront-signer";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { DsqlSigner } from "@aws-sdk/dsql-signer";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { formatUrl as _formatUrl } from "@aws-sdk/util-format-url";
import { SignatureV4 as _SignatureV4 } from "@smithy/signature-v4";
import * as R from "remeda";

import { Utils } from ".";
import { ApplicationError } from "./errors";

import type {
  CreateApiCommandInput,
  CreateChannelNamespaceCommandInput,
  DeleteApiCommandInput,
  DeleteChannelNamespaceCommandInput,
  GetApiCommandInput,
  GetChannelNamespaceCommandInput,
  UpdateApiCommandInput,
  UpdateChannelNamespaceCommandInput,
} from "@aws-sdk/client-appsync";
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
import type { AwsCredentialIdentity } from "@smithy/types";
import type { NonNullableProperties, StartsWith } from "./types";

export type AwsContext = {
  appsync?: { client: AppSyncClient };
  credentials: AwsCredentialIdentity;
  dsql?: { signer: DsqlSigner };
  sqs?: { client: SQSClient };
  s3?: { client: S3Client };
  sigv4?: { signers: Record<string, _SignatureV4> };
  ssm?: { client: SSMClient };
  sts?: { client: STSClient };
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
  TContext extends Omit<AwsContext, "credentials">,
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

  return AwsContext.with(
    { ...context, credentials: await fromNodeProviderChain()() },
    callback,
  );
}

export namespace Appsync {
  export const Client = AppSyncClient;
  export type Client = AppSyncClient;

  export const createApi = async (
    input: NonNullableProperties<CreateApiCommandInput>,
  ) => useAws("appsync").client.send(new CreateApiCommand(input));

  export const getApi = async (
    input: NonNullableProperties<GetApiCommandInput>,
  ) => useAws("appsync").client.send(new GetApiCommand(input));

  export const updateApi = async (
    input: NonNullableProperties<UpdateApiCommandInput>,
  ) => useAws("appsync").client.send(new UpdateApiCommand(input));

  export const deleteApi = async (
    input: NonNullableProperties<DeleteApiCommandInput>,
  ) => useAws("appsync").client.send(new DeleteApiCommand(input));

  export const createChannelNamespace = async (
    input: NonNullableProperties<CreateChannelNamespaceCommandInput>,
  ) => useAws("appsync").client.send(new CreateChannelNamespaceCommand(input));

  export const getChannelNamespace = async (
    input: NonNullableProperties<GetChannelNamespaceCommandInput>,
  ) => useAws("appsync").client.send(new GetChannelNamespaceCommand(input));

  export const updateChannelNamespace = async (
    input: NonNullableProperties<UpdateChannelNamespaceCommandInput>,
  ) => useAws("appsync").client.send(new UpdateChannelNamespaceCommand(input));

  export const deleteChannelNamespace = async (
    input: NonNullableProperties<DeleteChannelNamespaceCommandInput>,
  ) => useAws("appsync").client.send(new DeleteChannelNamespaceCommand(input));
}

export namespace Cloudfront {
  export const buildUrl = <TPath extends string>({
    protocol = "https:",
    fqdn,
    path,
  }: {
    protocol?: string;
    fqdn: string;
    path: StartsWith<"/", TPath>;
  }) => new URL(`${protocol}//${fqdn}${path}`);

  export const getSignedUrl = (...args: Parameters<typeof _getSignedUrl>) =>
    new URL(_getSignedUrl(...args));
}

export namespace Dsql {
  interface BuildSignerProps extends Omit<DsqlSignerConfig, "region"> {
    region: NonNullable<DsqlSignerConfig["region"]>;
  }

  export const buildSigner = ({
    credentials = fromNodeProviderChain(),
    sha256 = Sha256,
    ...props
  }: BuildSignerProps) => new DsqlSigner({ credentials, sha256, ...props });

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
  interface BuildSignerProps
    extends Omit<Partial<SignatureV4Init>, "region" | "service"> {
    region: SignatureV4Init["region"];
    service: SignatureV4Init["service"];
  }

  export const buildSigner = ({
    credentials = fromNodeProviderChain(),
    sha256 = Sha256,
    region,
    service,
  }: BuildSignerProps) =>
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

  export const putParameter = async (
    input: NonNullableProperties<PutParameterCommandInput>,
  ) => useAws("ssm").client.send(new PutParameterCommand(input));

  export async function getParameter(
    input: NonNullableProperties<GetParameterCommandInput>,
  ) {
    const { Parameter, $metadata } = await useAws("ssm").client.send(
      new GetParameterCommand(input),
    );
    if (!Parameter?.Value)
      throw new ParameterNotFound({
        message: `Parameter of name "${input.Name}" not found or has no value`,
        $metadata,
      });

    return Parameter.Value;
  }

  export const deleteParameter = async (
    input: NonNullableProperties<DeleteParameterCommandInput>,
  ) => useAws("ssm").client.send(new DeleteParameterCommand(input));
}

export namespace Sts {
  export const Client = STSClient;
  export type Client = STSClient;

  export const assumeRole = async (
    input: NonNullableProperties<AssumeRoleCommandInput>,
  ) => useAws("sts").client.send(new AssumeRoleCommand(input));

  export type AssumeRoleCredentialsInput = (
    | { type: "arn"; role: { arn: string } }
    | { type: "name"; accountId: string; role: { name: string } }
  ) & { role: { sessionName: string } };

  export async function getAssumeRoleCredentials(
    input: AssumeRoleCredentialsInput,
  ) {
    const { Credentials } = await assumeRole({
      RoleArn:
        input.type === "arn"
          ? input.role.arn
          : `arn:aws:iam::${input.accountId}:role/${input.role.name}`,
      RoleSessionName: input.role.sessionName,
    });

    if (!Credentials?.AccessKeyId || !Credentials.SecretAccessKey)
      throw new Error("Missing assume role credentials");

    return {
      accessKeyId: Credentials.AccessKeyId,
      secretAccessKey: Credentials.SecretAccessKey,
      sessionToken: Credentials.SessionToken,
      expiration: Credentials.Expiration,
    };
  }
}

export namespace Util {
  export const formatUrl = _formatUrl;
}
