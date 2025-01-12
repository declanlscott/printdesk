import {
  AppSyncClient,
  CreateChannelNamespaceCommand,
  DeleteChannelNamespaceCommand,
  GetChannelNamespaceCommand,
  UpdateChannelNamespaceCommand,
} from "@aws-sdk/client-appsync";
import { Credentials } from "@printworks/core/utils/aws";

import type {
  ChannelNamespace,
  CreateChannelNamespaceCommandInput,
} from "@aws-sdk/client-appsync";
import type { AssumeRoleCommandInput } from "@aws-sdk/client-sts";
import type { NonNullableProperties } from "@printworks/core/utils/types";
import type * as pulumi from "@pulumi/pulumi";

type ChannelNamespaceInputs =
  NonNullableProperties<CreateChannelNamespaceCommandInput>;
export interface ChannelNamespaceProviderInputs extends ChannelNamespaceInputs {
  roleChain: Array<AssumeRoleCommandInput>;
}

type ChannelNamespaceOutputs = Required<ChannelNamespace>;
export interface ChannelNamespaceProviderOutputs
  extends ChannelNamespaceOutputs {
  roleChain: Array<AssumeRoleCommandInput>;
}

export class ChannelNamespaceProvider
  implements pulumi.dynamic.ResourceProvider
{
  private static _getClient = (roleChain: Array<AssumeRoleCommandInput>) =>
    new AppSyncClient({
      credentials: Credentials.fromRoleChain(roleChain),
    });

  async create({
    roleChain,
    ...inputs
  }: ChannelNamespaceProviderInputs): Promise<
    pulumi.dynamic.CreateResult<ChannelNamespaceProviderOutputs>
  > {
    const client = ChannelNamespaceProvider._getClient(roleChain);

    const output = await client.send(new CreateChannelNamespaceCommand(inputs));
    if (!output.channelNamespace)
      throw new Error(`Failed creating channel namespace "${inputs.name}"`);

    const channelNamespace = output.channelNamespace as ChannelNamespaceOutputs;

    return {
      id: channelNamespace.name,
      outs: { ...channelNamespace, roleChain },
    };
  }

  async read(
    id: string,
    props: ChannelNamespaceProviderOutputs,
  ): Promise<pulumi.dynamic.ReadResult<ChannelNamespaceProviderOutputs>> {
    const client = ChannelNamespaceProvider._getClient(props.roleChain);

    const output = await client.send(
      new GetChannelNamespaceCommand({ apiId: props.apiId, name: props.name }),
    );
    if (!output.channelNamespace)
      throw new Error(`Failed reading channel namespace "${id}"`);

    const channelNamespace = output.channelNamespace as ChannelNamespaceOutputs;

    return {
      id,
      props: { ...props, ...channelNamespace },
    };
  }

  async update(
    id: string,
    olds: ChannelNamespaceProviderOutputs,
    { roleChain, ...news }: ChannelNamespaceProviderInputs,
  ): Promise<pulumi.dynamic.UpdateResult<ChannelNamespaceProviderOutputs>> {
    const client = ChannelNamespaceProvider._getClient(roleChain);

    const output = await client.send(new UpdateChannelNamespaceCommand(news));
    if (!output.channelNamespace)
      throw new Error(`Failed updating channel namespace "${id}"`);

    const channelNamespace = output.channelNamespace as ChannelNamespaceOutputs;

    return {
      outs: { ...olds, ...channelNamespace, roleChain },
    };
  }

  async delete(id: string, props: ChannelNamespaceProviderOutputs) {
    const client = ChannelNamespaceProvider._getClient(props.roleChain);

    await client.send(
      new DeleteChannelNamespaceCommand({ apiId: props.apiId, name: id }),
    );
  }
}
