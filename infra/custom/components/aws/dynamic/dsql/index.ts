import { Link } from "~/.sst/platform/src/components/link";
import { physicalName } from "~/.sst/platform/src/components/naming";
import { ClusterProvider } from "./providers/cluster";

import type {
  ClusterProviderInputs,
  ClusterProviderOutputs,
} from "./providers/cluster";

export namespace Dsql {
  export type ClusterInputs = {
    [TKey in keyof ClusterProviderInputs]: $util.Input<
      ClusterProviderInputs[TKey]
    >;
  };

  export type ClusterOutputs = {
    [TKey in keyof ClusterProviderOutputs]: $util.Output<
      ClusterProviderOutputs[TKey]
    >;
  };

  export interface Cluster extends ClusterOutputs {}
  export class Cluster extends $util.dynamic.Resource implements Link.Linkable {
    constructor(
      name: string,
      props: ClusterInputs,
      opts?: $util.CustomResourceOptions,
    ) {
      super(
        new ClusterProvider(),
        name,
        {
          ...props,
          tags: {
            Name: physicalName(256, name),
            "sst:app": $app.name,
            "sst:stage": $app.stage,
            ...props.tags,
          },
          identifier: undefined,
          arn: undefined,
          status: undefined,
          creationTime: undefined,
        },
        opts,
      );
    }

    get endpoint() {
      return $interpolate`${this.id}.dsql.${aws.getRegionOutput().name}.on.aws`;
    }

    getSSTLink(): Link.Definition<{
      host: $util.Output<string>;
      port: $util.Output<number>;
      database: $util.Output<string>;
      user: $util.Output<string>;
      ssl: $util.Output<boolean>;
    }> {
      return {
        properties: {
          host: this.endpoint,
          port: $output(5432),
          database: $output("postgres"),
          user: $output("admin"),
          ssl: $output(true),
        },
        include: [
          sst.aws.permission({
            actions: ["dsql:DbConnectAdmin"],
            resources: [this.arn],
          }),
        ],
      };
    }
  }
}
