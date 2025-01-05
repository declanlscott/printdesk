import { Link } from "~/.sst/platform/src/components/link";
import { ApiProvider } from "./providers/api";
import { ChannelNamespaceProvider } from "./providers/channel-namespace";

import type { ApiProviderInputs, ApiProviderOutputs } from "./providers/api";
import type {
  ChannelNamespaceProviderInputs,
  ChannelNamespaceProviderOutputs,
} from "./providers/channel-namespace";

export namespace Appsync {
  export type ApiInputs = {
    [TKey in keyof ApiProviderInputs]: $util.Input<ApiProviderInputs[TKey]>;
  };

  export type ApiOutputs = {
    [TKey in keyof ApiProviderOutputs]: $util.Output<ApiProviderOutputs[TKey]>;
  };

  export interface Api extends ApiOutputs {}
  export class Api extends $util.dynamic.Resource implements Link.Linkable {
    constructor(
      name: string,
      props: ApiInputs,
      opts?: $util.ComponentResourceOptions,
    ) {
      super(
        new ApiProvider(name),
        name,
        {
          ...props,
          tags: {
            "sst:app": $app.name,
            "sst:stage": $app.stage,
            ...props.tags,
          },
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

    getSSTLink(): Link.Definition<{
      dns: {
        http: $util.Output<string>;
        realtime: $util.Output<string>;
      };
    }> {
      return {
        properties: {
          dns: {
            http: this.dns.apply((dns) => dns.HTTP),
            realtime: this.dns.apply((dns) => dns.REALTIME),
          },
        },
        include: [
          sst.aws.permission({
            actions: [
              "appsync:EventConnect",
              "appsync:EventSubscribe",
              "appsync:EventPublish",
            ],
            resources: [$interpolate`${this.apiArn}/*`],
          }),
        ],
      };
    }
  }

  export type ChannelNamespaceInputs = {
    [TKey in keyof ChannelNamespaceProviderInputs]: $util.Input<
      ChannelNamespaceProviderInputs[TKey]
    >;
  };

  export type ChannelNamespaceOutputs = {
    [TKey in keyof ChannelNamespaceProviderOutputs]: $util.Output<
      ChannelNamespaceProviderOutputs[TKey]
    >;
  };

  export interface ChannelNamespace extends ChannelNamespaceOutputs {}
  export class ChannelNamespace extends $util.dynamic.Resource {
    constructor(
      name: string,
      props: ChannelNamespaceInputs,
      opts?: $util.CustomResourceOptions,
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
}
