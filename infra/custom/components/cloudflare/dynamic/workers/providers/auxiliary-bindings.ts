import * as R from "remeda";

import { DEFAULT_ACCOUNT_ID as CLOUDFLARE_ACCOUNT_ID } from "~/.sst/platform/src/components/cloudflare";
import { cfFetch } from "~/.sst/platform/src/components/cloudflare/helpers/fetch";

const scriptsResource = `/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts`;
const settingsResource = (scriptName: string) =>
  `/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${scriptName}/settings`;

type Binding =
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
    };

type Script = {
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

export interface AuxiliaryBindingsProviderInputs {
  scriptName: string;
  bindings: Array<Binding>;
}

export interface AuxiliaryBindingsProviderOutputs
  extends AuxiliaryBindingsProviderInputs {
  createdOn: string;
  modifiedOn: string;
}

export class AuxiliaryBindingsProvider
  implements $util.dynamic.ResourceProvider
{
  async create({
    scriptName,
    bindings,
  }: AuxiliaryBindingsProviderInputs): Promise<
    $util.dynamic.CreateResult<AuxiliaryBindingsProviderOutputs>
  > {
    const initialBindings = await cfFetch<{ bindings?: Array<Binding> }>(
      settingsResource(scriptName),
      { method: "GET" },
    ).then(({ result }) => result.bindings ?? []);

    const formData = new FormData();
    formData.set(
      "settings",
      JSON.stringify({
        bindings: R.pipe(
          initialBindings,
          R.concat(bindings),
          R.uniqueWith(R.isDeepEqual),
        ),
      }),
    );

    await cfFetch(settingsResource(scriptName), {
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
        bindings,
        createdOn: script.created_on,
        modifiedOn: script.modified_on,
      },
    };
  }

  async diff(
    id: string,
    olds: AuxiliaryBindingsProviderOutputs,
    news: AuxiliaryBindingsProviderInputs,
  ): Promise<$util.dynamic.DiffResult> {
    const replaces: NonNullable<$util.dynamic.DiffResult["replaces"]> = [];

    const script = await cfFetch<Array<Script>>(scriptsResource, {
      method: "GET",
    }).then(({ result }) => result.find((script) => script.id === id));
    if (!script) throw new Error(`Script "${id}" not found.`);

    if (olds.scriptName !== news.scriptName) replaces.push("scriptName");
    if (!R.isDeepEqual(olds.bindings, news.bindings)) replaces.push("bindings");
    if (olds.createdOn !== script.created_on) replaces.push("createdOn");
    if (olds.modifiedOn !== script.modified_on) replaces.push("modifiedOn");

    return {
      changes: !!replaces.length,
      replaces,
    };
  }
}
