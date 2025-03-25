import { Documents } from "@printworks/core/backend/documents";
import { useTenant } from "@printworks/core/tenants/context";
import { Credentials, S3 } from "@printworks/core/utils/aws";
import { Resource } from "sst";
import * as v from "valibot";

import { t } from "~/api/trpc";
import { authz } from "~/api/trpc/middleware/auth";
import {
  executeApiSigner,
  s3Client,
  ssmClient,
} from "~/api/trpc/middleware/aws";
import { userProcedure } from "~/api/trpc/procedures/protected";

export const documentsRouter = t.router({
  setMimeTypes: userProcedure
    .use(authz("documents-mime-types", "update"))
    .input(v.object({ mimeTypes: v.array(v.string()) }))
    .use(
      ssmClient(() => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.putParameters.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiSetDocumentsMimeTypes",
      })),
    )
    .use(
      executeApiSigner(() => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiSetDocumentsMimeTypes",
      })),
    )
    .mutation(async ({ input }) => {
      await Documents.setMimeTypes(input.mimeTypes);
    }),
  getMimeTypes: userProcedure
    .use(
      executeApiSigner(() => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiGetDocumentsMimeTypes",
      })),
    )
    .query(async () => Documents.getMimeTypes()),
  getSignedGetUrl: userProcedure
    .input(
      v.object({
        // TODO
      }),
    )
    .use(
      executeApiSigner(() => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiGetDocumentsSignedGetUrl",
      })),
    )
    .use(
      s3Client(() => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.bucketsAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiGetDocumentsSignedGetUrl",
      })),
    )
    .query(async () =>
      S3.getSignedGetUrl({
        Bucket: await Documents.getBucket(),
        Key: "TODO",
      }),
    ),
  getSignedPutUrl: userProcedure
    .input(
      v.object({
        // TODO
      }),
    )
    .use(
      executeApiSigner(() => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiGetDocumentsSignedPutUrl",
      })),
    )
    .use(
      s3Client(() => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.bucketsAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiGetDocumentsSignedPutUrl",
      })),
    )
    .query(async () =>
      S3.getSignedPutUrl({
        Bucket: await Documents.getBucket(),
        Key: "TODO",
      }),
    ),
  setSizeLimit: userProcedure
    .use(authz("documents-size-limit", "update"))
    .input(
      v.object({
        byteSize: v.pipe(v.number(), v.integer(), v.minValue(0)),
      }),
    )
    .use(
      ssmClient(() => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.putParameters.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiSetDocumentsSizeLimit",
      })),
    )
    .use(
      executeApiSigner(() => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiSetDocumentsSizeLimit",
      })),
    )
    .mutation(async ({ input }) => {
      await Documents.setSizeLimit(input.byteSize);
    }),
  getSizeLimit: userProcedure
    .use(
      executeApiSigner(() => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiGetDocumentsSizeLimit",
      })),
    )
    .query(async () => Documents.getSizeLimit()),
});
