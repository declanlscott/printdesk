import { Api } from "@printworks/core/api";
import { S3, SignatureV4, Ssm, Sts, withAws } from "@printworks/core/utils/aws";
import { createMiddleware } from "hono/factory";
import { Resource } from "sst";

/**
 * Depends on sts client and execute-api signer
 */
export const appsyncSigner = (roleName: string, roleSessionName: string) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        sigv4: {
          signers: {
            appsync: SignatureV4.buildSigner({
              region: Resource.Aws.region,
              service: "appsync",
              credentials: await Sts.getAssumeRoleCredentials({
                type: "name",
                accountId: await Api.getAccountId(),
                roleName,
                roleSessionName,
              }),
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

/**
 * Depends on sts client and execute-api signer
 */
export const s3Client = (roleSessionName: string) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        s3: {
          client: new S3.Client({
            credentials: await Sts.getAssumeRoleCredentials({
              type: "name",
              accountId: await Api.getAccountId(),
              roleName: Resource.Aws.tenant.bucketsAccessRole.name,
              roleSessionName,
            }),
          }),
        },
      },
      next,
    ),
  );

/**
 * Depends on sts client and execute-api signer
 */
export const ssmClient = (roleSessionName: string) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        ssm: {
          client: new Ssm.Client({
            credentials: await Sts.getAssumeRoleCredentials({
              type: "name",
              accountId: await Api.getAccountId(),
              roleName: Resource.Aws.tenant.putParametersRole.name,
              roleSessionName,
            }),
          }),
        },
      },
      next,
    ),
  );

export const stsClient = createMiddleware(async (_, next) =>
  withAws({ sts: { client: new Sts.Client() } }, next),
);
