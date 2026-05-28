import { buildTemplate } from "../../utils";

import type { Link } from "~/sst/link";

export interface AccessPointArgs {
  identifier: $util.Input<string>;
}

export class AccessPoint extends $util.ComponentResource implements Link.Linkable {
  public static readonly __pulumiType = "pd:templates:AwsS3AccessPoint";

  public readonly identifier: $util.Output<string>;
  public readonly name: $util.Output<string>;

  public constructor(name: string, args: AccessPointArgs, opts?: $util.ComponentResourceOptions) {
    super(AccessPoint.__pulumiType, name, {}, opts);

    this.identifier = $output(args.identifier);
    this.name = this.identifier.apply(buildTemplate);
  }

  public getSSTLink() {
    return {
      properties: { name: this.name },
      include: [
        sst.aws.permission({
          actions: ["s3:PutObject"],
          resources: [
            $interpolate`arn:aws:s3:${aws.getRegionOutput().region}:${aws.getCallerIdentityOutput().accountId}:accesspoint/${this.identifier.apply((identifier) => buildTemplate(identifier, "*"))}/object/*`,
          ],
        }),
      ],
    };
  }
}
