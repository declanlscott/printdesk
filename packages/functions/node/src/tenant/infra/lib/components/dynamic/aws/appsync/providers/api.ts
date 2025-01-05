import { Appsync } from "@printworks/core/utils/aws";

import { logicalName, physicalName } from "../../../naming";

import type * as pulumi from "@pulumi/pulumi";

type ApiInputs = Parameters<typeof Appsync.createApi>[0];
export interface ApiProviderInputs extends Omit<ApiInputs, "name"> {
  name?: string;
}

type ApiOutputs = Required<
  NonNullable<Awaited<ReturnType<typeof Appsync.createApi>>["api"]>
>;
export type ApiProviderOutputs = ApiOutputs;

export class ApiProvider implements pulumi.dynamic.ResourceProvider {
  private _logicalName: string;

  constructor(name: string) {
    this._logicalName = logicalName(name);
  }

  async create(
    inputs: ApiProviderInputs,
  ): Promise<pulumi.dynamic.CreateResult<ApiProviderOutputs>> {
    const output = await Appsync.createApi({
      name: physicalName(50, this._logicalName),
      ...inputs,
    });
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
  ): Promise<pulumi.dynamic.ReadResult<ApiProviderOutputs>> {
    const output = await Appsync.getApi({ apiId: id });
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
  ): Promise<pulumi.dynamic.UpdateResult<ApiProviderOutputs>> {
    const output = await Appsync.updateApi({
      apiId: id,
      name: olds.name,
      ...news,
    });
    if (!output.api) throw new Error(`Failed updating api "${id}"`);

    const api = output.api as ApiOutputs;

    return {
      outs: { ...olds, ...api },
    };
  }

  async delete(id: string, _props: ApiProviderOutputs) {
    await Appsync.deleteApi({ apiId: id });
  }
}
