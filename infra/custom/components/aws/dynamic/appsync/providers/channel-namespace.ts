import { AppsyncBase } from "../base";

import type {
  ChannelNamespace,
  CreateChannelNamespaceCommandInput,
} from "@aws-sdk/client-appsync";

type ChannelNamespaceInputs = {
  [TKey in keyof Omit<CreateChannelNamespaceCommandInput, "tags">]: NonNullable<
    CreateChannelNamespaceCommandInput[TKey]
  >;
};
export type ChannelNamespaceProviderInputs = ChannelNamespaceInputs;

type ChannelNamespaceOutputs = Required<ChannelNamespace>;
export type ChannelNamespaceProviderOutputs = ChannelNamespaceOutputs;

export class ChannelNamespaceProvider
  extends AppsyncBase
  implements $util.dynamic.ResourceProvider
{
  async create(
    inputs: ChannelNamespaceProviderInputs,
  ): Promise<$util.dynamic.CreateResult<ChannelNamespaceOutputs>> {
    const client = await ChannelNamespaceProvider._getClient();

    const output = await client.send(
      await ChannelNamespaceProvider._getSdk().then(
        (sdk) =>
          new sdk.CreateChannelNamespaceCommand({
            tags: {
              "sst:app": $app.name,
              "sst:stage": $app.stage,
            },
            ...inputs,
          }),
      ),
    );
    if (!output.channelNamespace)
      throw new Error("Failed creating channel namespace");

    const channelNamespace = output.channelNamespace as ChannelNamespaceOutputs;

    return {
      id: channelNamespace.name,
      outs: channelNamespace,
    };
  }

  async read(
    id: string,
    props: ChannelNamespaceProviderOutputs,
  ): Promise<$util.dynamic.ReadResult<ChannelNamespaceProviderOutputs>> {
    const client = await ChannelNamespaceProvider._getClient();

    const output = await client.send(
      await ChannelNamespaceProvider._getSdk().then(
        (sdk) =>
          new sdk.GetChannelNamespaceCommand({
            apiId: props.apiId,
            name: props.name,
          }),
      ),
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
    news: ChannelNamespaceProviderInputs,
  ): Promise<$util.dynamic.UpdateResult<ChannelNamespaceProviderOutputs>> {
    const client = await ChannelNamespaceProvider._getClient();

    const output = await client.send(
      await ChannelNamespaceProvider._getSdk().then(
        (sdk) => new sdk.UpdateChannelNamespaceCommand(news),
      ),
    );
    if (!output.channelNamespace)
      throw new Error(`Failed updating channel namespace "${id}"`);

    const channelNamespace = output.channelNamespace as ChannelNamespaceOutputs;

    return {
      outs: { ...olds, ...channelNamespace },
    };
  }

  async delete(id: string, props: ChannelNamespaceProviderOutputs) {
    const client = await ChannelNamespaceProvider._getClient();

    await client.send(
      await ChannelNamespaceProvider._getSdk().then(
        (sdk) =>
          new sdk.DeleteChannelNamespaceCommand({
            apiId: props.apiId,
            name: id,
          }),
      ),
    );
  }
}
