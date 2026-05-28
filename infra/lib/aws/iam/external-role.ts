import { transform } from "~/sst/component";

import { PhysicalName } from "../../physical-name";

import type { Transform } from "~/sst/component";
import type { Link } from "~/sst/link";

export interface ExternalRoleArgs {
  transform?: {
    externalId?: Transform<random.RandomPasswordArgs>;
    role?: Transform<aws.iam.RoleArgs>;
  };
}

export class ExternalRole extends $util.ComponentResource implements Link.Linkable {
  public static readonly __pulumiType = "pd:aws:IamExternalRole";

  readonly #externalId: random.RandomPassword;
  readonly #role: aws.iam.Role;

  public constructor(
    name: string,
    args: ExternalRoleArgs = {},
    opts?: $util.ComponentResourceOptions,
  ) {
    super(ExternalRole.__pulumiType, name, {}, opts);

    this.#externalId = new random.RandomPassword(
      ...transform(
        args.transform?.externalId,
        `${name}RoleExternalId`,
        {
          length: 32,
          special: true,
        },
        { parent: this },
      ),
    );

    const physicalName = new PhysicalName(`${name}Role`, { max: 64 }).result;

    this.#role = new aws.iam.Role(
      ...transform(
        args.transform?.role,
        `${name}Role`,
        {
          name: physicalName,
          assumeRolePolicy: aws.iam.getPolicyDocumentOutput({
            statements: [
              {
                principals: [
                  {
                    type: "AWS",
                    identifiers: [
                      $interpolate`arn:aws:iam::${aws.getCallerIdentityOutput().accountId}:root`,
                    ],
                  },
                ],
                actions: ["sts:AssumeRole"],
                conditions: [
                  {
                    test: "StringEquals",
                    variable: "sts:ExternalId",
                    values: [this.#externalId.result],
                  },
                ],
              },
            ],
          }).json,
        },
        { parent: this },
      ),
    );
  }

  public get arn() {
    return this.#role.arn;
  }

  public get externalId() {
    return this.#externalId.result;
  }

  public get nodes() {
    return {
      role: this.#role,
      externalId: this.#externalId,
    };
  }

  public getSSTLink() {
    return {
      properties: {
        name: this.#role.name,
        arn: this.#role.arn,
        externalId: this.#externalId.result,
      },
      include: [
        sst.aws.permission({
          actions: ["sts:AssumeRole"],
          resources: [this.#role.arn],
        }),
      ],
    };
  }
}
