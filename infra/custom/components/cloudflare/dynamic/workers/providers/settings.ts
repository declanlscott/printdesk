import * as R from "remeda";

import { DEFAULT_ACCOUNT_ID as CLOUDFLARE_ACCOUNT_ID } from "~/.sst/platform/src/components/cloudflare";

const CLOUDFLARE_API_BASE_URL = "https://api.cloudflare.com/client/v4";
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const CLOUDFLARE_API_TOKEN: string =
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  $app.providers?.cloudflare?.apiToken ?? process.env.CLOUDFLARE_API_TOKEN;

export type Settings = {
  bindings?: Array<
    | {
        name: string;
        type: "ai";
      }
    | {
        dataset: string;
        name: string;
        type: "analytics_engine";
      }
    | {
        name: string;
        type: "assets";
      }
    | {
        name: string;
        type: "browser";
      }
    | {
        id: string;
        name: string;
        type: "d1";
      }
    | {
        name: string;
        namespace: string;
        type: "dispatch_namespace";
        outbound?: {
          params?: Array<string>;
          worker?: {
            environment?: string;
            service?: string;
          };
        };
      }
    | {
        class_name: string;
        name: string;
        type: "durable_object_namespace";
        environment?: string;
        namespace_id?: string;
        script_name?: string;
      }
    | {
        id: string;
        name: string;
        type: "hyperdrive";
      }
    | {
        json: string;
        name: string;
        type: "json";
      }
    | {
        name: string;
        namespace_id: string;
        type: "kv_namespace";
      }
    | {
        certificate_id: string;
        name: string;
        type: "mtls_certificate";
      }
    | {
        name: string;
        text: string;
        type: "plain_text";
      }
    | {
        name: string;
        pipeline: string;
        type: "pipelines";
      }
    | {
        name: string;
        queue_name: string;
        type: "queue";
      }
    | {
        bucket_name: string;
        name: string;
        type: "r2_bucket";
      }
    | {
        name: string;
        text: string;
        type: "secret_text";
      }
    | {
        environment: string;
        name: string;
        service: string;
        type: "service";
      }
    | {
        name: string;
        service: string;
        type: "tail_consumer";
      }
    | {
        index_name: string;
        name: string;
        type: "vectorize";
      }
    | {
        name: string;
        type: "version_metadata";
      }
    | {
        name: string;
        secret_name: string;
        store_id: string;
        type: "secrets_store_secret";
      }
    | {
        algorithm: unknown;
        format: "raw" | "pkcs8" | "spki" | "jwk";
        name: string;
        type: "secret_key";
        usages: Array<
          | "encrypt"
          | "decrypt"
          | "sign"
          | "verify"
          | "deriveKey"
          | "deriveBits"
          | "wrapKey"
          | "unwrapKey"
        >;
        key_base64?: string;
        key_jwk?: unknown;
      }
    | {
        name: string;
        type: "ratelimit";
        namespace_id: string;
        simple: {
          limit: number;
          period: number;
        };
      }
  >;
  compatibility_date?: string;
  compatibility_flags?: Array<string>;
  limits?: {
    cpu_ms?: number;
  };
  logpush?: boolean;
  migrations?:
    | {
        deleted_classes?: Array<string>;
        new_classes?: Array<string>;
        new_sqlite_classes?: Array<string>;
        new_tag?: string;
        old_tag?: string;
        renamed_classes?: Array<{
          from?: string;
          to?: string;
        }>;
        transferred_classes: Array<{
          from?: string;
          from_script?: string;
          to?: string;
        }>;
      }
    | {
        new_tag?: string;
        old_tag?: string;
        steps?: Array<{
          deleted_classes?: Array<string>;
          new_classes?: Array<string>;
          new_sqlite_classes?: Array<string>;
          renamed_classes?: Array<{
            from?: string;
            to?: string;
          }>;
          transferred_classes: Array<{
            from?: string;
            from_script?: string;
            to?: string;
          }>;
        }>;
      };
  observability?: {
    enabled: boolean;
    head_sampling_rate?: number;
  };
  placement?: {
    mode?: "smart";
  };
  tags?: Array<string>;
  tail_consumers?: Array<{
    service: string;
    environment?: string;
    namespace?: string;
  }>;
  usage_model?: "standard";
};

type ApiResponse<TResult> =
  | {
      errors: Array<{
        code: number;
        message: string;
        documentation_url?: string;
        source?: {
          pointer?: string;
        };
      }>;
      messages: Array<{
        code: number;
        message: string;
        documentation_url?: string;
        source?: {
          pointer?: string;
        };
      }>;
      success: false;
      result: undefined;
    }
  | {
      errors: Array<{
        code: number;
        message: string;
        documentation_url?: string;
        source?: {
          pointer?: string;
        };
      }>;
      messages: Array<{
        code: number;
        message: string;
        documentation_url?: string;
        source?: {
          pointer?: string;
        };
      }>;
      success: true;
      result: TResult;
    };

export interface SettingsProviderInputs extends Settings {
  scriptName: string;
}

export type SettingsProviderOutputs = SettingsProviderInputs;

export class SettingsProvider implements $util.dynamic.ResourceProvider {
  private static async _send<TResult>(
    scriptName: string,
    init: RequestInit = {},
  ) {
    const resource = `/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${scriptName}/settings`;

    const res = await fetch(`${CLOUDFLARE_API_BASE_URL}${resource}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        ...init.headers,
      },
    });
    if (!res.ok)
      throw new Error(
        `Cloudflare API request to "${resource}" failed with ${res.status}, ${res.statusText}.`,
      );

    const json = (await res.json()) as ApiResponse<TResult>;
    if (!json.success)
      throw new Error(`Cloudflare API request to "${resource}" failed.`, {
        cause: {
          errors: json.errors,
          messages: json.messages,
        },
      });

    return json;
  }

  async create({
    scriptName,
    ...settings
  }: SettingsProviderInputs): Promise<
    $util.dynamic.CreateResult<SettingsProviderOutputs>
  > {
    const initial = await SettingsProvider._send<Settings>(scriptName, {
      method: "GET",
    });

    const formData = new FormData();
    formData.set(
      "settings",
      JSON.stringify(
        R.mergeDeep(initial.result, {
          ...settings,
          compatibility_flags: R.concat(
            initial.result.compatibility_flags ?? [],
            settings.compatibility_flags ?? [],
          ),
          bindings: R.concat(
            initial.result.bindings ?? [],
            settings.bindings ?? [],
          ),
          tags: R.concat(initial.result.tags ?? [], settings.tags ?? []),
          tail_consumers: R.concat(
            initial.result.tail_consumers ?? [],
            settings.tail_consumers ?? [],
          ),
        }),
      ),
    );

    const { result } = await SettingsProvider._send<Settings>(scriptName, {
      method: "PATCH",
      body: formData,
    });

    return {
      id: scriptName,
      outs: {
        scriptName: scriptName,
        ...result,
      },
    };
  }
}
