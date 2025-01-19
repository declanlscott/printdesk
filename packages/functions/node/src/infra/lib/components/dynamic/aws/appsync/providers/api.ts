import {
  AppSyncClient,
  CreateApiCommand,
  DeleteApiCommand,
  GetApiCommand,
  UpdateApiCommand,
} from "@aws-sdk/client-appsync";
import { Credentials } from "@printworks/core/utils/aws";

import { logicalName, physicalName } from "../../../naming";

import type { Api, CreateApiCommandInput } from "@aws-sdk/client-appsync";
import type { AssumeRoleCommandInput } from "@aws-sdk/client-sts";
import type { NonNullableProperties } from "@printworks/core/utils/types";
import type * as pulumi from "@pulumi/pulumi";

interface ApiInputs
  extends Omit<NonNullableProperties<CreateApiCommandInput>, "name"> {
  name?: string;
}
export interface ApiProviderInputs extends ApiInputs {
  roleChain: Array<AssumeRoleCommandInput>;
}

type ApiOutputs = Required<Api>;
export interface ApiProviderOutputs extends ApiOutputs {
  roleChain: Array<AssumeRoleCommandInput>;
}

export class ApiProvider implements pulumi.dynamic.ResourceProvider {
  private _logicalName: string;

  constructor(name: string) {
    this._logicalName = logicalName(name);
  }

  private static _getClient = (roleChain: Array<AssumeRoleCommandInput>) =>
    new AppSyncClient({
      credentials: Credentials.fromRoleChain(roleChain),
    });

  async create({
    roleChain,
    ...inputs
  }: ApiProviderInputs): Promise<
    pulumi.dynamic.CreateResult<ApiProviderOutputs>
  > {
    const client = ApiProvider._getClient(roleChain);

    const output = await client.send(
      new CreateApiCommand({
        name: physicalName(50, this._logicalName),
        ...inputs,
      }),
    );
    if (!output.api)
      throw new Error(`Failed creating api "${this._logicalName}"`);

    const api = output.api as ApiOutputs;

    return {
      id: api.apiId,
      outs: { ...api, roleChain },
    };
  }

  async read(
    id: string,
    props: ApiProviderOutputs,
  ): Promise<pulumi.dynamic.ReadResult<ApiProviderOutputs>> {
    const client = ApiProvider._getClient(props.roleChain);

    const output = await client.send(new GetApiCommand({ apiId: id }));
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
    { roleChain, ...news }: ApiProviderInputs,
  ): Promise<pulumi.dynamic.UpdateResult<ApiProviderOutputs>> {
    const client = ApiProvider._getClient(roleChain);

    const output = await client.send(
      new UpdateApiCommand({ apiId: id, name: olds.name, ...news }),
    );
    if (!output.api) throw new Error(`Failed updating api "${id}"`);

    const api = output.api as ApiOutputs;

    return {
      outs: { ...olds, ...api, roleChain },
    };
  }

  async delete(id: string, props: ApiProviderOutputs) {
    const client = ApiProvider._getClient(props.roleChain);

    await client.send(new DeleteApiCommand({ apiId: id }));
  }
}
