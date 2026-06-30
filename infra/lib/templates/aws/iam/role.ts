import { buildTemplate } from "../../utils";

import type { Link } from "~/sst/link";

export interface RoleArgs {
  identifier: $util.Input<string>;
}

export class Role extends $util.ComponentResource implements Link.Linkable {
  public static readonly __pulumiType = "pd:templates:AwsIamRole";

  public readonly identifier: $util.Output<string>;
  public readonly name: $util.Output<string>;
  public readonly arn: $util.Output<string>;

  public constructor(name: string, args: RoleArgs, opts?: $util.ComponentResourceOptions) {
    super(Role.__pulumiType, name, {}, opts);

    this.identifier = $output(args.identifier);
    this.name = this.identifier.apply(buildTemplate);
    this.arn = $interpolate`arn:aws:iam::${aws.getCallerIdentityOutput().accountId}:role/${this.identifier}`;
  }

  public getSSTLink() {
    const resources = [
      $interpolate`arn:aws:iam::${aws.getCallerIdentityOutput().accountId}:role/${this.identifier.apply((identifier) => buildTemplate(identifier, "*"))}`,
    ];

    return {
      properties: { name: this.name, arn: this.arn },
      include: [
        sst.aws.permission({
          actions: ["sts:TagSession"],
          resources,
          conditions: [
            {
              test: "ForAllValues:StringEquals",
              variable: "aws:TagKeys",
              values: ["pd:tenantId"],
            },
          ],
        }),
        sst.aws.permission({
          actions: ["sts:AssumeRole"],
          resources,
          conditions: [
            {
              test: "StringEquals",
              variable: "iam:ResourceTag/pd:tenantId",
              values: ["${aws:PrincipalTag/pd:tenantId}"],
            },
          ],
        }),
      ],
    };
  }
}
