/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import { ChannelNamespaceProvider } from "./providers/channel-namespace";
import { EventApiProvider } from "./providers/event-api";

import type { Link } from "~/.sst/platform/src/components/link";
import type {
  ChannelNamespaceProviderInputs,
  ChannelNamespaceProviderOutputs,
} from "./providers/channel-namespace";
import type {
  EventApiProviderInputs,
  EventApiProviderOutputs,
} from "./providers/event-api";

export namespace Appsync {
  export type EventApiInputs = {
    [TKey in keyof EventApiProviderInputs]: $util.Input<
      EventApiProviderInputs[TKey]
    >;
  };

  export type EventApiOutputs = {
    [TKey in keyof EventApiProviderOutputs]: $util.Output<
      EventApiProviderOutputs[TKey]
    >;
  };

  export interface EventApi extends EventApiOutputs {}
  export class EventApi
    extends $util.dynamic.Resource
    implements Link.Linkable
  {
    constructor(
      name: string,
      props: EventApiInputs,
      opts?: $util.ComponentResourceOptions,
    ) {
      super(
        new EventApiProvider(name),
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

    getSSTLink() {
      return {
        properties: {
          dns: {
            http: this.dns.apply((dns) => dns.HTTP),
            realtime: this.dns.apply((dns) => dns.REALTIME),
          },
        },
        include: [
          sst.aws.permission({
            actions: ["appsync:EventConnect"],
            resources: [this.apiArn],
          }),
          sst.aws.permission({
            actions: ["appsync:EventSubscribe", "appsync:EventPublish"],
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
