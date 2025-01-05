import { Appsync } from "@printworks/core/utils/aws";

import type * as pulumi from "@pulumi/pulumi";

type ChannelNamespaceInput = Parameters<
  typeof Appsync.createChannelNamespace
>[0];
export type ChannelNamespaceProviderInputs = ChannelNamespaceInput;

type ChannelNamespaceOutput = Required<
  NonNullable<
    Awaited<
      ReturnType<typeof Appsync.createChannelNamespace>
    >["channelNamespace"]
  >
>;
export type ChannelNamespaceProviderOutputs = ChannelNamespaceOutput;

export class ChannelNamespaceProvider
  implements pulumi.dynamic.ResourceProvider
{
  async create(
    inputs: ChannelNamespaceProviderInputs,
  ): Promise<pulumi.dynamic.CreateResult<ChannelNamespaceProviderOutputs>> {
    const output = await Appsync.createChannelNamespace(inputs);

    const channelNamespace = output.channelNamespace as ChannelNamespaceOutput;

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

    const channelNamespace = output.channelNamespace as ChannelNamespaceOutput;

    return {
      id,
      props: { ...props, ...channelNamespace },
    };
  }

  async update(
    _name: string,
    olds: ChannelNamespaceProviderOutputs,
    news: ChannelNamespaceProviderInputs,
  ): Promise<pulumi.dynamic.UpdateResult<ChannelNamespaceProviderOutputs>> {
    const output = await Appsync.updateChannelNamespace(news);

    const channelNamespace = output.channelNamespace as ChannelNamespaceOutput;

    return {
      outs: { ...olds, ...channelNamespace },
    };
  }

  async delete(name: string, props: ChannelNamespaceProviderOutputs) {
    await Appsync.deleteChannelNamespace({
      apiId: props.apiId,
      name,
    });
  }
}
