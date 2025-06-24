import type { Duration } from "date-fns";

export namespace Constants {
  export const TENANT_ID_PLACEHOLDER = "{{tenant_id}}";

  export const TOKEN_DELIMITER = "#";

  export const CLOUDFLARE_BINDING_NAMES = {
    RATE_LIMITER: "RATE_LIMITER",
  } as const;

  export const ENTRA_ID_OAUTH_SCOPES = [
    "openid",
    "profile",
    "email",
    "offline_access",
    "User.Read",
    "User.ReadBasic.All",
  ] as const;

  export const ENTRA_ID_APP_ROLES = [
    "User.ReadBasic.All",
    "GroupMember.Read.All",
  ] as const;

  export const VITE_RESOURCE_PREFIX = "VITE_RESOURCE_";

  export const SUBJECT_KINDS = {
    USER: "user",
  } as const;

  export const OPENAUTH_CLIENT_IDS = {
    API: "api",
    REVERSE_PROXY: "reverse-proxy",
    WEB: "web",
  } as const;

  export const ACTOR_KINDS = {
    PUBLIC: "public",
    SYSTEM: "system",
    USER: SUBJECT_KINDS.USER,
  } as const;

  export const HEADER_NAMES = {
    TENANT_ID: "x-tenant-id",
    ROUTER_SECRET: "x-router-secret",
    SET_PAPERCUT_AUTH: "x-set-papercut-auth",
  } as const;

  export const ENTRA_ID = "entra_id";
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

  export const TENANT_SUBDOMAIN_PATTERN = new RegExp(/^[a-z0-9-]+$/);

  export const REPLICACHE_PULL_CHUNK_SIZE = 200;

  export const REPLICACHE_LIFETIME = {
    weeks: 2,
  } as const satisfies Duration;

  export const WORKFLOW_REVIEW_STATUS = "Review";

  export const MONTH_TRUNCATED_ISO_DATE_REGEX = new RegExp(
    /^\d{4}-(?:0[1-9]|1[0-2])$/u,
  );
}
