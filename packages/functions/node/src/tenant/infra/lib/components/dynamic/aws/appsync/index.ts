/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
/* eslint-disable @typescript-eslint/no-empty-object-type */

import * as pulumi from "@pulumi/pulumi";

import { ApiProvider } from "./providers/api";
import { ChannelNamespaceProvider } from "./providers/channel-namespace";

import type { ApiProviderInputs, ApiProviderOutputs } from "./providers/api";
import type {
  ChannelNamespaceProviderInputs,
  ChannelNamespaceProviderOutputs,
} from "./providers/channel-namespace";

export type ApiInputs = {
  [TKey in keyof ApiProviderInputs]: pulumi.Input<ApiProviderInputs[TKey]>;
};

export type ApiOutputs = {
  [TKey in keyof ApiProviderOutputs]: pulumi.Output<ApiProviderOutputs[TKey]>;
};

export interface Api extends Omit<ApiOutputs, "clientRoleArn"> {}
export class Api extends pulumi.dynamic.Resource {
  constructor(
    name: string,
    props: ApiInputs,
    opts?: pulumi.CustomResourceOptions,
  ) {
    super(
      new ApiProvider(name),
      name,
      {
        ...props,
        apiId: undefined,
        dns: undefined,
        apiArn: undefined,
        created: undefined,
        xrayEnabled: undefined,
        wafWebAclArn: undefined,
      },
      opts,
    );
  }
}

export type ChannelNamespaceInputs = {
  [TKey in keyof ChannelNamespaceProviderInputs]: pulumi.Input<
    ChannelNamespaceProviderInputs[TKey]
  >;
};

export type ChannelNamespaceOutputs = {
  [TKey in keyof ChannelNamespaceProviderOutputs]: pulumi.Output<
    ChannelNamespaceProviderOutputs[TKey]
  >;
};

export interface ChannelNamespace
  extends Omit<ChannelNamespaceOutputs, "clientRoleArn"> {}
export class ChannelNamespace extends pulumi.dynamic.Resource {
  constructor(
    name: string,
    props: ChannelNamespaceInputs,
    opts?: pulumi.CustomResourceOptions,
  ) {
    super(
      new ChannelNamespaceProvider(),
      name,
      {
        ...props,
        channelNamespaceArn: undefined,
        created: undefined,
        lastModified: undefined,
      },
      opts,
    );
  }
}
