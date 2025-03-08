/**
 * NOTE: This module provides constants and must remain framework-agnostic.
 * For example it should not depend on sst for linked resources. Other modules in the
 * core package may depend on sst, but this module should not.
 */

import type { Duration } from "date-fns";

export namespace Constants {
  export const SUBJECT_TYPES = {
    USER: "user",
  } as const;

  export const ACTOR_TYPES = {
    PUBLIC: "public",
    SYSTEM: "system",
    USER: SUBJECT_TYPES.USER,
  } as const;

  export const HEADER_NAMES = {
    TENANT_ID: "x-tenant-id",
  } as const;

  export const CONTEXT_NAMES = {
    ACTOR: "Actor",
    AWS: "Aws",
    GRAPH: "Graph",
    PUSH: "Push",
    TRANSACTION: "Transaction",
    XML: "Xml",
  } as const;

  export const ENTRA_ID = "entra-id";
  export const GOOGLE = "google";

  export const DB_SCHEMA_VERSION = 1;
  export const DB_TRANSACTION_MAX_RETRIES = 10;
  export const POSTGRES_SERIALIZATION_FAILURE_ERROR_CODE = "40001";
  export const POSTGRES_DEADLOCK_DETECTED_ERROR_CODE = "40P01";

  export const VARCHAR_LENGTH = 40;

  export const PAPERCUT_API_PAGINATION_LIMIT = 1000;
  export const PAPERCUT_API_REQUEST_BATCH_SIZE = 10;

  export const ASSETS_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "image/gif",
  ] as const;

  export const DEFAULT_PAPERCUT_SYNC_CRON_EXPRESSION = "55 1 * * ? *";
  export const DEFAULT_DOCUMENTS_MIME_TYPES = ["application/pdf"] as const;
  export const DEFAULT_DOCUMENTS_SIZE_LIMIT = 1024 * 1024 * 10; // 10MB

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
