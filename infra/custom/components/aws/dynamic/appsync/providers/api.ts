import {
  logicalName,
  physicalName,
} from "~/.sst/platform/src/components/naming";

import type { Api, CreateApiCommandInput } from "@aws-sdk/client-appsync";

type ApiInputs = {
  [TKey in keyof CreateApiCommandInput]: NonNullable<
    CreateApiCommandInput[TKey]
  >;
};
export interface ApiProviderInputs extends Omit<ApiInputs, "name"> {
  name?: string;
}

type ApiOutputs = Required<Api>;
export type ApiProviderOutputs = ApiOutputs;

export class ApiProvider implements $util.dynamic.ResourceProvider {
  private static _getSdk = async () => import("@aws-sdk/client-appsync");

  private static _getClient = async () =>
    ApiProvider._getSdk().then((sdk) => new sdk.AppSyncClient());

  private _logicalName: string;

  constructor(name: string) {
    this._logicalName = logicalName(name);
  }

  async create(
    inputs: ApiProviderInputs,
  ): Promise<$util.dynamic.CreateResult<ApiProviderOutputs>> {
    const client = await ApiProvider._getClient();

    const output = await client.send(
      await ApiProvider._getSdk().then(
        (sdk) =>
          new sdk.CreateApiCommand({
            name: physicalName(50, this._logicalName),
            ...inputs,
          }),
      ),
    );
    if (!output.api)
      throw new Error(`Failed creating api "${this._logicalName}"`);

    const api = output.api as ApiOutputs;

    return {
      id: api.apiId,
      outs: api,
    };
  }

  async read(
    id: string,
    props: ApiProviderOutputs,
  ): Promise<$util.dynamic.ReadResult<ApiProviderOutputs>> {
    const client = await ApiProvider._getClient();

    const output = await client.send(
      await ApiProvider._getSdk().then(
        (sdk) => new sdk.GetApiCommand({ apiId: id }),
      ),
    );
    if (!output.api) throw new Error(`Failed reading api "${id}"`);

    const api = output.api as ApiOutputs;

    return {
      id,
      props: { ...props, ...api },
    };
  }

  async update(
    id: string,
    olds: ApiProviderOutputs,
    news: ApiProviderInputs,
  ): Promise<$util.dynamic.UpdateResult<ApiProviderOutputs>> {
    const client = await ApiProvider._getClient();

    const output = await client.send(
      await ApiProvider._getSdk().then(
        (sdk) =>
          new sdk.UpdateApiCommand({ apiId: id, name: olds.name, ...news }),
      ),
    );
    if (!output.api) throw new Error(`Failed updating api "${id}"`);

    const api = output.api as ApiOutputs;

    return {
      outs: { ...olds, ...api },
    };
  }

  async delete(id: string, _props: ApiProviderOutputs) {
    const client = await ApiProvider._getClient();

    await client.send(
      await ApiProvider._getSdk().then(
        (sdk) => new sdk.DeleteApiCommand({ apiId: id }),
      ),
    );
  }
}
