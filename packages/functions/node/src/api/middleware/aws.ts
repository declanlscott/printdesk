import { Api } from "@printworks/core/tenants/api";
import { S3, SignatureV4, Ssm, Sts, withAws } from "@printworks/core/utils/aws";
import { createMiddleware } from "hono/factory";
import { Resource } from "sst";

/**
 * NOTE: Tenant signer depends on sts client and execute-api signer
 */
export const appsyncSigner = (
  props:
    | { forTenant: true; role: { name: string; sessionName: string } }
    | { forTenant: false },
) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        sigv4: {
          signers: {
            appsync: SignatureV4.buildSigner({
              region: Resource.Aws.region,
              service: "appsync",
              credentials: props.forTenant
                ? await Sts.getAssumeRoleCredentials({
                    type: "name",
                    accountId: await Api.getAccountId(),
                    role: props.role,
                  })
                : undefined,
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
 * NOTE: Tenant client depends on sts client and execute-api signer
 */
export const s3Client = (
  props:
    | { forTenant: true; role: { sessionName: string } }
    | { forTenant: false },
) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        s3: {
          client: new S3.Client({
            credentials: props.forTenant
              ? await Sts.getAssumeRoleCredentials({
                  type: "name",
                  accountId: await Api.getAccountId(),
                  role: {
                    name: Resource.Aws.tenant.bucketsAccessRole.name,
                    sessionName: props.role.sessionName,
                  },
                })
              : undefined,
          }),
        },
      },
      next,
    ),
  );

/**
 * NOTE: Tenant client depends on sts client and execute-api signer
 */
export const ssmClient = (
  props:
    | { forTenant: true; role: { sessionName: string } }
    | { forTenant: false },
) =>
  createMiddleware(async (_, next) =>
    withAws(
      {
        ssm: {
          client: new Ssm.Client({
            credentials: props.forTenant
              ? await Sts.getAssumeRoleCredentials({
                  type: "name",
                  accountId: await Api.getAccountId(),
                  role: {
                    name: Resource.Aws.tenant.putParametersRole.name,
                    sessionName: props.role.sessionName,
                  },
                })
              : undefined,
          }),
        },
      },
      next,
    ),
  );

export const stsClient = createMiddleware(async (_, next) =>
  withAws({ sts: { client: new Sts.Client() } }, next),
);
