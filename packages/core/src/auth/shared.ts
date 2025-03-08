import * as v from "valibot";

import { Constants } from "../utils/constants";
import { nanoIdSchema, timestampsSchema } from "../utils/shared";

export const userSubjectPropertiesSchema = v.object({
  id: nanoIdSchema,
  tenantId: nanoIdSchema,
});
export type UserSubjectProperties = v.InferOutput<
  typeof userSubjectPropertiesSchema
>;

export const oauth2ProvidersTableName = "oauth2_providers";

export const oauth2ProviderTypes = [
  Constants.ENTRA_ID,
  Constants.GOOGLE,
] as const;
export type Oauth2ProviderType = (typeof oauth2ProviderTypes)[number];

export const oauth2ProvidersSchema = v.object({
  id: v.string(),
  tenantId: v.string(),
  type: v.picklist(oauth2ProviderTypes),
  ...timestampsSchema.entries,
});
