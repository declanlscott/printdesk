import * as R from "remeda";

import { DEFAULT_ACCOUNT_ID as CLOUDFLARE_ACCOUNT_ID } from "~/.sst/platform/src/components/cloudflare";
import { cfFetch } from "~/.sst/platform/src/components/cloudflare/helpers/fetch";

const scriptsResource = `/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts`;
const settingsResource = (scriptName: string) =>
  `/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${scriptName}/settings`;

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

export type Script = {
  id?: string;
  created_on?: string;
  etag?: string;
  has_assets?: boolean;
  has_modules?: boolean;
  logpush?: boolean;
  modified_on?: string;
  placement?: {
    last_analyzed_at?: string;
    mode?: "smart";
    status?: "SUCCESS" | "UNSUPPORTED_APPLICATION" | "INSUFFICIENT_INVOCATIONS";
  };
  placement_mode?: "smart";
  placement_status?:
    | "SUCCESS"
    | "UNSUPPORTED_APPLICATION"
    | "INSUFFICIENT_INVOCATIONS";
  tail_consumers?: Array<{
    service: string;
    environment?: string;
    namespace?: string;
  }>;
  usage_model: "standard";
};

export interface SettingsProviderInputs extends Settings {
  scriptName: string;
}

export interface SettingsProviderOutputs {
  scriptName: string;
  patch: Settings;
  createdOn: string;
  modifiedOn: string;
}

export class SettingsProvider implements $util.dynamic.ResourceProvider {
  async create({
    scriptName,
    ...patch
  }: SettingsProviderInputs): Promise<
    $util.dynamic.CreateResult<SettingsProviderOutputs>
  > {
    const { result: settings } = await cfFetch<Settings>(
      settingsResource(scriptName),
      { method: "GET" },
    );

    const mergeArray = <
      TElement,
      TData extends ReadonlyArray<TElement>,
      TOther extends ReadonlyArray<TElement>,
    >(
      data: TData,
      other: TOther,
    ) => R.pipe(other, R.concat(data), R.uniqueWith(R.isDeepEqual));

    const formData = new FormData();
    formData.set(
      "settings",
      JSON.stringify({
        bindings: patch.bindings
          ? mergeArray(settings.bindings ?? [], patch.bindings)
          : undefined,
        compatibility_date: patch.compatibility_date,
        compatibility_flags: patch.compatibility_flags
          ? mergeArray(
              settings.compatibility_flags ?? [],
              patch.compatibility_flags,
            )
          : undefined,
        limits: patch.limits,
        logpush: patch.logpush,
        migrations: patch.migrations,
        observability: patch.observability,
        placement: patch.placement,
        tags: patch.tags
          ? mergeArray(settings.tags ?? [], patch.tags)
          : undefined,
        tail_consumers: patch.tail_consumers
          ? mergeArray(settings.tail_consumers ?? [], patch.tail_consumers)
          : undefined,
        usage_model: patch.usage_model,
      } satisfies Settings),
    );

    await cfFetch<Settings>(settingsResource(scriptName), {
      method: "PATCH",
      body: formData,
    });

    const script = await cfFetch<Array<Script>>(scriptsResource, {
      method: "GET",
    }).then(({ result }) => result.find((script) => script.id === scriptName));
    if (!script?.created_on || !script.modified_on)
      throw new Error(`Script "${scriptName}" not found.`);

    return {
      id: scriptName,
      outs: {
        scriptName,
        patch,
        createdOn: script.created_on,
        modifiedOn: script.modified_on,
      },
    };
  }

  async diff(
    id: string,
    olds: SettingsProviderOutputs,
    news: SettingsProviderInputs,
  ): Promise<$util.dynamic.DiffResult> {
    const replaces: NonNullable<$util.dynamic.DiffResult["replaces"]> = [];

    const script = await cfFetch<Array<Script>>(scriptsResource, {
      method: "GET",
    }).then(({ result }) => result.find((script) => script.id === id));
    if (!script) throw new Error(`Script "${id}" not found.`);

    if (olds.scriptName !== news.scriptName) replaces.push("scriptName");
    if (olds.createdOn !== script.created_on) replaces.push("createdOn");
    if (olds.modifiedOn !== script.modified_on) replaces.push("modifiedOn");

    const keys = R.keys(olds.patch);
    for (const key of keys)
      if (!R.isDeepEqual(olds.patch[key], news[key])) replaces.push(key);

    return {
      changes: !!replaces.length,
      replaces,
    };
  }
}
