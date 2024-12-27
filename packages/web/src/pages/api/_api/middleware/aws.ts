import { Api } from "@printworks/core/api";
import { S3, SignatureV4, Ssm, Sts, withAws } from "@printworks/core/utils/aws";
import { createMiddleware } from "hono/factory";
import { Resource } from "sst";

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

export const s3Client = (name: string) =>
  createMiddleware(async (_, next) =>
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
        sts: { client: new Sts.Client() },
      },
      async () =>
        withAws(
          {
            s3: {
              client: new S3.Client({
                credentials: await Sts.getAssumeRoleCredentials({
                  type: "name",
                  accountId: await Api.getAccountId(),
                  roleName: Resource.Aws.tenant.bucketsAccessRole.name,
                  roleSessionName: name,
                }),
              }),
            },
          },
          next,
        ),
    ),
  );

export const ssmClient = (name: string) =>
  createMiddleware(async (_, next) =>
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
        sts: { client: new Sts.Client() },
      },
      async () =>
        withAws(
          {
            ssm: {
              client: new Ssm.Client({
                credentials: await Sts.getAssumeRoleCredentials({
                  type: "name",
                  accountId: await Api.getAccountId(),
                  roleName: Resource.Aws.tenant.putParametersRole.name,
                  roleSessionName: name,
                }),
              }),
            },
          },
          next,
        ),
    ),
  );
