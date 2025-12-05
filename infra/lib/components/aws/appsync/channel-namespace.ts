/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import { ChannelNamespaceProvider } from "./providers/channel-namespace";

import type {
  ChannelNamespaceProviderInputs,
  ChannelNamespaceProviderOutputs,
} from "./providers/channel-namespace";

type ChannelNamespaceInputs = {
  [TKey in keyof ChannelNamespaceProviderInputs]: $util.Input<
    ChannelNamespaceProviderInputs[TKey]
  >;
};

export type ChannelNamespaceArgs = ChannelNamespaceInputs;

type ChannelNamespaceOutputs = {
  [TKey in keyof ChannelNamespaceProviderOutputs]: $util.Output<
    ChannelNamespaceProviderOutputs[TKey]
  >;
};

export interface ChannelNamespace extends ChannelNamespaceOutputs {}
export class ChannelNamespace extends $util.dynamic.Resource {
  constructor(
    name: string,
    args: ChannelNamespaceArgs,
    opts?: $util.CustomResourceOptions,
  ) {
    super(
      new ChannelNamespaceProvider(),
      name,
      {
        ...args,
        channelNamespaceArn: undefined,
        created: undefined,
        lastModified: undefined,
      },
      opts,
    );
  }
}
