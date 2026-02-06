import { PhysicalName } from "../../physical-name";

import type { Link } from "~/.sst/platform/src/components/link";

export type ClusterArgs = aws.dsql.ClusterArgs;

export class Cluster extends aws.dsql.Cluster implements Link.Linkable {
  readonly name: PhysicalName["result"];

  constructor(
    name: string,
    args?: ClusterArgs,
    opts?: $util.CustomResourceOptions,
  ) {
    const physicalName = new PhysicalName(name, { max: 256 }).result;

    super(
      name,
      {
        ...args,
        tags: $output(args?.tags).apply((tags) => ({
          ...tags,
          Name: physicalName,
          "sst:app": $app.name,
          "sst:stage": $app.stage,
        })),
      },
      opts,
    );

    this.name = physicalName;
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
