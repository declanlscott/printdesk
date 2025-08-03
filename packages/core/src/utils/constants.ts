import { Duration } from "effect";

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

  export const HEADER_KEYS = {
    TENANT_ID: "x-tenant-id",
    ROUTER_SECRET: "x-router-secret",
    PAPERCUT_INJECT_AUTH: "x-papercut-inject-auth",
  } as const;

  export const ENTRA_ID = "entra_id";
  export const GOOGLE = "google";

  /**
   * - A transaction can modify up to 3,000 rows, regardless of the number of secondary indexes
   * - The 3,000-row limit applies to all DML statements (INSERT, UPDATE, DELETE)
   *
   * See: https://docs.aws.amazon.com/aurora-dsql/latest/userguide/working-with-postgresql-compatibility-unsupported-features.html#working-with-postgresql-compatibility-unsupported-limitations
   */
  export const DB_TRANSACTION_ROW_MODIFICATION_LIMIT = 3_000;

  export const DB_SCHEMA_VERSION = 1;
  export const DB_TRANSACTION_MAX_RETRIES = 10;
  export const POSTGRES_SERIALIZATION_FAILURE_ERROR_CODE = "40001";
  export const POSTGRES_DEADLOCK_DETECTED_ERROR_CODE = "40P01";

  export const VARCHAR_LENGTH = 40;

  export const PAPERCUT_SERVER_PATH_PREFIX = "/papercut/server";
  export const PAPERCUT_WEB_SERVICES_API_PATH = "/rpc/api/xmlrpc";

  export const PAPERCUT_API_PAGINATION_LIMIT = 1_000;
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

  export const TENANT_SUBDOMAIN_REGEX = new RegExp(/^[a-z0-9-]+$/);

  export const REPLICACHE_PULL_CHUNK_SIZE = 200;

  export const REPLICACHE_LIFETIME = Duration.weeks(2);

  export const WORKFLOW_REVIEW_STATUS = "Review";

  export const MONTH_TRUNCATED_ISO_DATE_REGEX = new RegExp(
    /^\d{4}-(?:0[1-9]|1[0-2])$/u,
  );

  export const ISO_TIMESTAMP_REGEX = new RegExp(
    /^\d{4}-(?:0[1-9]|1[0-2])-(?:[12]\d|0[1-9]|3[01])[T ](?:0\d|1\d|2[0-3])(?::[0-5]\d){2}(?:\.\d{1,9})?(?:Z|[+-](?:0\d|1\d|2[0-3])(?::?[0-5]\d)?)$/u,
  );

  export const ISO_DATE_REGEX = new RegExp(
    /^\d{4}-(?:0[1-9]|1[0-2])-(?:[12]\d|0[1-9]|3[01])$/u,
  );

  export const HEX_COLOR_REGEX = new RegExp(
    /^#(?:[\da-fA-F]{3,4}|[\da-fA-F]{6}|[\da-fA-F]{8})$/u,
  );
}
