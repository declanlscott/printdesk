import { Credentials, S3 } from "@printdesk/core/aws";
import { Documents } from "@printdesk/core/backend/documents";
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

import type { InferRouterIO, IO } from "~/api/trpc/types";

export const documentsRouter = t.router({
  setMimeTypes: userProcedure
    .use(authz("documents-mime-types", "update"))
    .input(v.object({ mimeTypes: v.array(v.string()) }))
    .use(
      ssmClient(() => [
        {
          RoleArn: Credentials.buildRoleArn(
            Resource.Aws.tenant.roles.putParameters.nameTemplate,
          ),
          RoleSessionName: "ApiSetDocumentsMimeTypes",
        },
      ]),
    )
    .use(
      executeApiSigner(() => [
        {
          RoleArn: Credentials.buildRoleArn(
            Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          ),
          RoleSessionName: "ApiSetDocumentsMimeTypes",
        },
      ]),
    )
    .mutation(async ({ input }) => {
      await Documents.setMimeTypes(input.mimeTypes);
    }),
  getMimeTypes: userProcedure
    .use(
      executeApiSigner(() => [
        {
          RoleArn: Credentials.buildRoleArn(
            Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          ),
          RoleSessionName: "ApiGetDocumentsMimeTypes",
        },
      ]),
    )
    .query(async () => Documents.getMimeTypes()),
  getPresignedGetUrl: userProcedure
    .input(
      v.object({
        // TODO
      }),
    )
    .use(
      executeApiSigner(() => [
        {
          RoleArn: Credentials.buildRoleArn(
            Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          ),
          RoleSessionName: "ApiGetDocumentsSignedGetUrl",
        },
      ]),
    )
    .use(
      ssmClient(() => [
        {
          RoleArn: Credentials.buildRoleArn(
            Resource.Aws.tenant.roles.putParameters.nameTemplate,
          ),
          RoleSessionName: "ApiGetDocumentsSignedGetUrl",
        },
      ]),
    )
    .query(async () =>
      S3.getPresignedGetUrl({
        Bucket: await Documents.getBucket(),
        Key: "TODO",
      }),
    ),
  getPresignedPutUrl: userProcedure
    .input(
      v.object({
        // TODO
      }),
    )
    .use(
      executeApiSigner(() => [
        {
          RoleArn: Credentials.buildRoleArn(
            Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          ),
          RoleSessionName: "ApiGetDocumentsSignedPutUrl",
        },
      ]),
    )
    .use(
      s3Client(() => [
        {
          RoleArn: Credentials.buildRoleArn(
            Resource.Aws.tenant.roles.bucketsAccess.nameTemplate,
          ),
          RoleSessionName: "ApiGetDocumentsSignedPutUrl",
        },
      ]),
    )
    .query(async () =>
      S3.getPresignedPutUrl({
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
      ssmClient(() => [
        {
          RoleArn: Credentials.buildRoleArn(
            Resource.Aws.tenant.roles.putParameters.nameTemplate,
          ),
          RoleSessionName: "ApiSetDocumentsSizeLimit",
        },
      ]),
    )
    .use(
      executeApiSigner(() => [
        {
          RoleArn: Credentials.buildRoleArn(
            Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          ),
          RoleSessionName: "ApiSetDocumentsSizeLimit",
        },
      ]),
    )
    .mutation(async ({ input }) => {
      await Documents.setSizeLimit(input.byteSize);
    }),
  getSizeLimit: userProcedure
    .use(
      executeApiSigner(() => [
        {
          RoleArn: Credentials.buildRoleArn(
            Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          ),
          RoleSessionName: "ApiGetDocumentsSizeLimit",
        },
      ]),
    )
    .query(async () => Documents.getSizeLimit()),
});

export type DocumentsRouterIO<TIO extends IO> = InferRouterIO<
  TIO,
  typeof documentsRouter
>;
