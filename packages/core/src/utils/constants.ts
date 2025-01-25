/**
 * NOTE: This module provides constants and must remain framework-agnostic.
 * For example it should not depend on sst for linked resources. Other modules in the
 * core package may depend on sst, but this module should not.
 */

import type { Duration } from "date-fns";

export namespace Constants {
  export const ENTRA_ID = "entra-id";
  export const GOOGLE = "google";

  export const DB_SCHEMA_VERSION = 1;
  export const DB_TRANSACTION_MAX_RETRIES = 10;
  export const POSTGRES_SERIALIZATION_FAILURE_ERROR_CODE = "40001";
  export const POSTGRES_DEADLOCK_DETECTED_ERROR_CODE = "40P01";

  export const ROW_VERSION_COLUMN_NAME = "xmin";

  export const VARCHAR_LENGTH = 40;

  export const PAPERCUT_API_PAGINATION_LIMIT = 1000;
  export const PAPERCUT_API_REQUEST_BATCH_SIZE = 10;

  export const DOCUMENTS_MIME_TYPES_PARAMETER_NAME =
    "/app/settings/documents/mime-types";
  export const DOCUMENTS_SIZE_LIMIT_PARAMETER_NAME =
    "/app/settings/documents/size-limit";
  export const TAILNET_PAPERCUT_SERVER_URI_PARAMETER_NAME =
    "/papercut/server/tailnet-uri";
  export const PAPERCUT_SERVER_AUTH_TOKEN_PARAMETER_NAME =
    "/papercut/server/auth-token";
  export const TAILSCALE_OAUTH_CLIENT_PARAMETER_NAME =
    "/tailscale/oauth-client";

  export const ASSETS_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "image/gif",
  ] as const;

  export const DEFAULT_DOCUMENTS_MIME_TYPES = ["application/pdf"] as const;

  export const NANOID_CUSTOM_ALPHABET = "2346789abcdefghijkmnpqrtwxyz";
  export const NANOID_LENGTH = 20;
  export const NANOID_REGEX = new RegExp(
    `^[${NANOID_CUSTOM_ALPHABET}]{${NANOID_LENGTH}}$`,
  );

  export const TENANT_SLUG_PATTERN = new RegExp(/^[a-z0-9-]+$/);

  export const REPLICACHE_POKE = "replicache_poke";

  export const REPLICACHE_PULL_CHUNK_SIZE = 200;

  export const REPLICACHE_LIFETIME = {
    weeks: 2,
  } as const satisfies Duration;

  export const WORKFLOW_REVIEW_STATUS = "Review";
}
