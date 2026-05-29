import * as R from "remeda";

import { PhysicalName } from "../../physical-name";

import { transform } from "~/sst/component";
import type { Transform } from "~/sst/component";
import type { Link } from "~/sst/link";

export interface AccessKeyArgs {
  permissions?: $util.Input<Array<ReturnType<typeof sst.aws.permission>>>;
  transform?: {
    user?: Transform<aws.iam.UserArgs>;
    accessKey?: Transform<aws.iam.AccessKeyArgs>;
  };
}

export class AccessKey extends $util.ComponentResource implements Link.Linkable {
  public static readonly __pulumiType = "pd:aws:IamAccessKey";

  readonly #user: aws.iam.User;
  readonly #accessKey: aws.iam.AccessKey;

  public constructor(name: string, args: AccessKeyArgs, opts?: $util.ComponentResourceOptions) {
    super(AccessKey.__pulumiType, name, {}, opts);

    const userName = new PhysicalName(`${name}User`, { max: 64 }, { parent: this });

    this.#user = new aws.iam.User(
      ...transform(
        args.transform?.user,
        userName.logical,
        { name: userName.result, forceDestroy: true },
        { parent: this },
      ),
    );

    $output(args.permissions).apply((permissions = []) => {
      if (permissions.length > 0)
        new aws.iam.UserPolicy(
          `${name}UserPolicy`,
          {
            user: this.#user.name,
            policy: aws.iam.getPolicyDocumentOutput({
              statements: permissions.map(({ effect = "allow", ...statement }) => ({
                effect: effect.charAt(0).toUpperCase() + effect.slice(1),
                ...R.omit(statement, ["type"]),
              })),
            }).json,
          },
          { parent: this },
        );
    });

    this.#accessKey = new aws.iam.AccessKey(
      ...transform(
        args.transform?.accessKey,
        `${name}AccessKey`,
        { user: this.#user.name },
        { parent: this },
      ),
    );
  }

  public get user() {
    return this.#user;
  }

  public get id() {
    return this.#accessKey.id;
  }

  public get secret() {
    return $util.secret(this.#accessKey.secret);
  }

  public getSSTLink() {
    return {
      properties: {
        id: this.id,
        secret: this.secret,
      },
    };
  }
}
