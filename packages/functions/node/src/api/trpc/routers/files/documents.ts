import { Credentials, S3 } from "@printworks/core/aws";
import { Documents } from "@printworks/core/backend/documents";
import { useTenant } from "@printworks/core/tenants/context";
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
    .meta({
      kind: "access-control",
      resource: "documents-mime-types",
      action: "update",
    })
    .use(authz)
    .input(v.object({ mimeTypes: v.array(v.string()) }))
    .meta({
      kind: "aws-assume-role",
      getInput: () => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.putParameters.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiSetDocumentsMimeTypes",
      }),
    })
    .use(ssmClient)
    .meta({
      kind: "aws-assume-role",
      getInput: () => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiSetDocumentsMimeTypes",
      }),
    })
    .use(executeApiSigner)
    .mutation(async ({ input }) => {
      await Documents.setMimeTypes(input.mimeTypes);
    }),
  getMimeTypes: userProcedure
    .meta({
      kind: "aws-assume-role",
      getInput: () => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiGetDocumentsMimeTypes",
      }),
    })
    .use(executeApiSigner)
    .query(async () => Documents.getMimeTypes()),
  getSignedGetUrl: userProcedure
    .input(
      v.object({
        // TODO
      }),
    )
    .meta({
      kind: "aws-assume-role",
      getInput: () => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiGetDocumentsSignedGetUrl",
      }),
    })
    .use(executeApiSigner)
    .meta({
      kind: "aws-assume-role",
      getInput: () => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.bucketsAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiGetDocumentsSignedGetUrl",
      }),
    })
    .use(s3Client)
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
    .meta({
      kind: "aws-assume-role",
      getInput: () => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiGetDocumentsSignedPutUrl",
      }),
    })
    .use(executeApiSigner)
    .meta({
      kind: "aws-assume-role",
      getInput: () => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.bucketsAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiGetDocumentsSignedPutUrl",
      }),
    })
    .use(s3Client)
    .query(async () =>
      S3.getSignedPutUrl({
        Bucket: await Documents.getBucket(),
        Key: "TODO",
      }),
    ),
  setSizeLimit: userProcedure
    .meta({
      kind: "access-control",
      resource: "documents-size-limit",
      action: "update",
    })
    .use(authz)
    .input(
      v.object({
        byteSize: v.pipe(v.number(), v.integer(), v.minValue(0)),
      }),
    )
    .meta({
      kind: "aws-assume-role",
      getInput: () => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.putParameters.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiSetDocumentsSizeLimit",
      }),
    })
    .use(ssmClient)
    .meta({
      kind: "aws-assume-role",
      getInput: () => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiSetDocumentsSizeLimit",
      }),
    })
    .use(executeApiSigner)
    .mutation(async ({ input }) => {
      await Documents.setSizeLimit(input.byteSize);
    }),
  getSizeLimit: userProcedure
    .meta({
      kind: "aws-assume-role",
      getInput: () => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiGetDocumentsSizeLimit",
      }),
    })
    .use(executeApiSigner)
    .query(async () => Documents.getSizeLimit()),
});

export type DocumentsRouterIO<TIO extends IO> = InferRouterIO<
  TIO,
  typeof documentsRouter
>;
