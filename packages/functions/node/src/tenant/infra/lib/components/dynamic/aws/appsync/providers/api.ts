import { Appsync } from "@printworks/core/utils/aws";

import { logicalName, physicalName } from "../../../naming";

import type * as pulumi from "@pulumi/pulumi";

type ApiInput = Parameters<typeof Appsync.createApi>[0];
export interface ApiProviderInputs extends Omit<ApiInput, "name"> {
  name?: string;
}

type ApiOutput = Required<
  NonNullable<Awaited<ReturnType<typeof Appsync.createApi>>["api"]>
>;
export type ApiProviderOutputs = ApiOutput;

export class ApiProvider implements pulumi.dynamic.ResourceProvider {
  private _logicalName: string;

  constructor(name: string) {
    this._logicalName = logicalName(name);
  }

  async create(
    input: ApiProviderInputs,
  ): Promise<pulumi.dynamic.CreateResult<ApiProviderOutputs>> {
    const output = await Appsync.createApi({
      name: physicalName(50, this._logicalName),
      ...input,
    });

    const api = output.api as ApiOutput;

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
    if (!output.api) throw new Error("Missing api");

    const api = output.api as ApiOutput;

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
    if (!output.api) throw new Error("Missing api");

    const api = output.api as ApiOutput;

    return {
      outs: { ...olds, ...api },
    };
  }

  async delete(id: string, _props: ApiProviderOutputs) {
    await Appsync.deleteApi({ apiId: id });
  }
}
