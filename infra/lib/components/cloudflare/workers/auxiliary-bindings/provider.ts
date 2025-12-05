import * as R from "remeda";

import { DEFAULT_ACCOUNT_ID as CLOUDFLARE_ACCOUNT_ID } from "~/.sst/platform/src/components/cloudflare";
import { cfFetch } from "~/.sst/platform/src/components/cloudflare/helpers/fetch";

import type { Binding } from "wrangler";

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
  bindings: Record<string, Binding>;
}

export interface AuxiliaryBindingsProviderOutputs extends AuxiliaryBindingsProviderInputs {
  createdOn: string;
  modifiedOn: string;
}

const scriptsResource = `/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts`;
const settingsResource = (scriptName: string) =>
  `/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${scriptName}/settings`;

export class AuxiliaryBindingsProvider
  implements $util.dynamic.ResourceProvider
{
  async create({
    scriptName,
    bindings,
  }: AuxiliaryBindingsProviderInputs): Promise<
    $util.dynamic.CreateResult<AuxiliaryBindingsProviderOutputs>
  > {
    const initialBindings = await cfFetch<{
      bindings?: Array<Binding & { name: string }>;
    }>(settingsResource(scriptName), { method: "GET" }).then(
      ({ result }) => result.bindings ?? [],
    );

    const formData = new FormData();
    formData.set(
      "settings",
      JSON.stringify({
        bindings: R.pipe(
          initialBindings,
          R.concat(
            R.pipe(
              R.entries(bindings),
              R.map(([name, binding]) => ({ name, ...binding })),
            ),
          ),
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

    return { changes: !!replaces.length, replaces };
  }
}
