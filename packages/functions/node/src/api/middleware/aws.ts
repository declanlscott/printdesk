import { Api } from "@printworks/core/tenants/api";
import { S3, SignatureV4, Ssm, Sts, withAws } from "@printworks/core/utils/aws";
import { createMiddleware } from "hono/factory";
import { Resource } from "sst";

async function getCredentials(role?: Sts.AssumeRoleCredentialsInput["role"]) {
  if (!role) return undefined;

  if ("name" in role)
    return Sts.getAssumeRoleCredentials({
      type: "name",
      accountId: await Api.getAccountId(),
      role,
    });

  return Sts.getAssumeRoleCredentials({
    type: "arn",
    role,
  });
}

export const credentials = createMiddleware(async (_, next) =>
  withAws({}, next),
);

/**
 * NOTE: Role specified by name depends on sts client and execute-api signer,
 * but role specified by arn only depends on sts client. No role means no dependencies.
 */
export const appsyncSigner = (role?: Sts.AssumeRoleCredentialsInput["role"]) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        sigv4: {
          signers: {
            appsync: SignatureV4.buildSigner({
              region: Resource.Aws.region,
              service: "appsync",
              credentials: await getCredentials(role),
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
 * NOTE: Role specified by name depends on sts client and execute-api signer,
 * but role specified by arn only depends on sts client. No role means no dependencies.
 */
export const s3Client = (role?: Sts.AssumeRoleCredentialsInput["role"]) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        s3: {
          client: new S3.Client({
            credentials: await getCredentials(role),
          }),
        },
      },
      next,
    ),
  );

/**
 * NOTE: Role specified by name depends on sts client and execute-api signer,
 * but role specified by arn only depends on sts client. No role means no dependencies.
 */
export const ssmClient = (role?: Sts.AssumeRoleCredentialsInput["role"]) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        ssm: {
          client: new Ssm.Client({
            credentials: await getCredentials(role),
          }),
        },
      },
      next,
    ),
  );

export const stsClient = createMiddleware(async (_, next) =>
  withAws({ sts: { client: new Sts.Client() } }, next),
);
