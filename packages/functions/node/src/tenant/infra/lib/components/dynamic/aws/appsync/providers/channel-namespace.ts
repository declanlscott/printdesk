import { Appsync } from "@printworks/core/utils/aws";

import type * as pulumi from "@pulumi/pulumi";

type ChannelNamespaceInputs = Parameters<
  typeof Appsync.createChannelNamespace
>[0];
export type ChannelNamespaceProviderInputs = ChannelNamespaceInputs;

type ChannelNamespaceOutputs = Required<
  NonNullable<
    Awaited<
      ReturnType<typeof Appsync.createChannelNamespace>
    >["channelNamespace"]
  >
>;
export type ChannelNamespaceProviderOutputs = ChannelNamespaceOutputs;

export class ChannelNamespaceProvider
  implements pulumi.dynamic.ResourceProvider
{
  async create(
    inputs: ChannelNamespaceProviderInputs,
  ): Promise<pulumi.dynamic.CreateResult<ChannelNamespaceProviderOutputs>> {
    const output = await Appsync.createChannelNamespace(inputs);
    if (!output.channelNamespace)
      throw new Error(`Failed creating channel namespace "${inputs.name}"`);

    const channelNamespace = output.channelNamespace as ChannelNamespaceOutputs;

    return {
      id: channelNamespace.name,
      outs: channelNamespace,
    };
  }

  async read(
    id: string,
    props: ChannelNamespaceProviderOutputs,
  ): Promise<pulumi.dynamic.ReadResult<ChannelNamespaceProviderOutputs>> {
    const output = await Appsync.getChannelNamespace({
      apiId: props.apiId,
      name: props.name,
    });
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
    news: ChannelNamespaceProviderInputs,
  ): Promise<pulumi.dynamic.UpdateResult<ChannelNamespaceProviderOutputs>> {
    const output = await Appsync.updateChannelNamespace(news);
    if (!output.channelNamespace)
      throw new Error(`Failed updating channel namespace "${id}"`);

    const channelNamespace = output.channelNamespace as ChannelNamespaceOutputs;

    return {
      outs: { ...olds, ...channelNamespace },
    };
  }

  async delete(id: string, props: ChannelNamespaceProviderOutputs) {
    await Appsync.deleteChannelNamespace({
      apiId: props.apiId,
      name: id,
    });
  }
}
