import type * as Duration from "effect/Duration";
import type * as Cookies from "effect/unstable/http/Cookies";
export namespace Constants {
  export const TENANT_ID_PLACEHOLDER = "{{tenant_id}}";

  export const ENTRA_ID_OAUTH_SCOPES = [
    "openid",
    "profile",
    "email",
    "offline_access",
    "User.Read",
    "User.ReadBasic.All",
  ] as const;

  export const ENTRA_ID_APP_ROLES = ["User.ReadBasic.All", "GroupMember.Read.All"] as const;

  export const SST_RESOURCE_PREFIX = "SST_RESOURCE_";
  export const VITE_RESOURCE_PREFIX = "VITE_RESOURCE_";

  export const COOKIE_NAMES = {
    ACCESS_TOKEN: "access_token",
    REFRESH_TOKEN: "refresh_token",
  } as const;

  export const COOKIE_OPTIONS = {
    httpOnly: true,
    maxAge: "30 days",
    path: "/",
    sameSite: "lax",
    secure: true,
  } as const satisfies Cookies.Cookie["options"];

  export const URL_PARAM_NAMES = {
    REDIRECT_URI: "redirect_uri",
    TENANT_SLUG: "tenant_slug",
  } as const;

  export const OPENAUTH_CLIENT_IDS = {
    API: "api",
    API_GATEWAY: "api-gateway",
    INVOICES_PROCESSOR: "invoices-processor",
    PAPERCUT_API_GATEWAY: "papercut-api-gateway",
    PAPERCUT_SYNC: "papercut-sync",
    WEB: "web",
  } as const;

  export const ENTRA_ID = "entra_id";
  export const GOOGLE = "google";
  export const CLIENT_CREDENTIALS = "client_credentials";

  /**
   * - A transaction can modify up to 3,000 rows, regardless of the number of secondary indexes
   * - The 3,000-row limit applies to all DML statements (INSERT, UPDATE, DELETE)
   *
   * See: https://docs.aws.amazon.com/aurora-dsql/latest/userguide/working-with-postgresql-compatibility-unsupported-features.html#working-with-postgresql-compatibility-unsupported-limitations
   */
  export const DB_TRANSACTION_ROW_MODIFICATION_LIMIT = 3_000;

  export const DB_SCHEMA_VERSION = 1;
  export const DB_TRANSACTION_MAX_RETRIES = 10;

  export const DYNAMO_SECONDARY_INDEXES = {
    GSI1: "gsi1",
  } as const;
  export const DYNAMO_KEYS = {
    PK: "pk",
    SK: "sk",
    GSI1_PK: `${DYNAMO_SECONDARY_INDEXES.GSI1}Pk`,
    GSI1_SK: `${DYNAMO_SECONDARY_INDEXES.GSI1}Sk`,
  } as const;
  export const KEY_LITERALS = {
    CLIENT: "CLIENT",
    DEPLOYMENT: "DEPLOYMENT",
    INFRA: "INFRA",
    INPUT: "INPUT",
    IP: "IP",
    TENANT: "TENANT",
    ORDER: "ORDER",
    OUTPUT: "OUTPUT",
    ROOM: "ROOM",
    USER: "USER",
  } as const;

  export const VARCHAR_LENGTH = 50;

  export const PAPERCUT_API_PATH = "/rpc/api/xmlrpc";
  export const PAPERCUT_API_PAGINATION_LIMIT = 1_000;
  export const PAPERCUT_API_REQUEST_BATCH_SIZE = 50;
  export const PAPERCUT_API_REQUEST_BATCH_DELAY = "100 millis" satisfies Duration.Input;

  export const GRAPH_REQUEST_BATCH_SIZE = 50;
  export const GRAPH_REQUEST_BATCH_DELAY = "100 millis" satisfies Duration.Input;

  export const ASSETS_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "image/gif",
  ] as const;

  export const WEB_BFF_PATHS = {
    login: "/login",
    oauthCallback: "/oauth/callback",
  } as const;

  export const DEFAULT_PAPERCUT_SYNC_CRON_EXPRESSION = "55 1 * * ? *";
  export const DEFAULT_DOCUMENTS_MIME_TYPES = ["application/pdf"] as const;
  export const DEFAULT_DOCUMENTS_SIZE_LIMIT = 1024 * 1024 * 10; // 10MB

  /** This order of characters is optimized for better gzip and brotli compression. */
  export const NANOID_ALPHABET = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
  export const NANOID_LENGTH = 11;

  export const REPLICACHE_LIFETIME = "2 weeks" satisfies Duration.Input;
  export const REPLICACHE_SYNC_STATE_KEY = "control/sync_state";

  export const SOFT_DELETE_LIFETIME = "12 weeks" satisfies Duration.Input;

  export const NANOID_REGEX = new RegExp(
    `^[${[...NANOID_ALPHABET].toSorted().join("")}]{${NANOID_LENGTH}}$`,
  );
  export const TENANT_SLUG_REGEX = new RegExp(/^[a-z0-9-]+$/);
  export const MONTH_TRUNCATED_ISO_DATE_REGEX = new RegExp(/^\d{4}-(?:0[1-9]|1[0-2])$/u);
  export const ISO_TIMESTAMP_REGEX = new RegExp(
    /^\d{4}-(?:0[1-9]|1[0-2])-(?:[12]\d|0[1-9]|3[01])[T ](?:0\d|1\d|2[0-3])(?::[0-5]\d){2}(?:\.\d{1,9})?(?:Z|[+-](?:0\d|1\d|2[0-3])(?::?[0-5]\d)?)$/u,
  );
  export const ISO_DATE_REGEX = new RegExp(/^\d{4}-(?:0[1-9]|1[0-2])-(?:[12]\d|0[1-9]|3[01])$/u);
  export const HEX_COLOR_REGEX = new RegExp(/^#(?:[\da-fA-F]{3,4}|[\da-fA-F]{6}|[\da-fA-F]{8})$/u);
  export const BASE64_REGEX = new RegExp(/^(?:[\da-z+/]{4})*(?:[\da-z+/]{2}==|[\da-z+/]{3}=)?$/iu);
  export const IPV4_REGEX = new RegExp(
    /^(?:(?:[1-9]|1\d|2[0-4])?\d|25[0-5])(?:\.(?:(?:[1-9]|1\d|2[0-4])?\d|25[0-5])){3}$/u,
  );

  export const SEPARATOR = String.fromCharCode(0x1f);
}
