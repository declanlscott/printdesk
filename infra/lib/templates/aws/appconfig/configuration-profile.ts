import { buildTemplate } from "../../utils";

import type { Link } from "~/sst/link";

export interface ConfigurationProfileArgs {
  identifier: $util.Input<string>;
}

export class ConfigurationProfile extends $util.ComponentResource implements Link.Linkable {
  public static readonly __pulumiType = "pd:templates:AwsAppConfigConfigurationProfile";

  public readonly identifier: $util.Output<string>;
  public readonly name: $util.Output<string>;

  public constructor(
    name: string,
    args: ConfigurationProfileArgs,
    opts?: $util.ComponentResourceOptions,
  ) {
    super(ConfigurationProfile.__pulumiType, name, {}, opts);

    this.identifier = $output(args.identifier);
    this.name = this.identifier.apply(buildTemplate);
  }

  public getSSTLink() {
    return { properties: { name: this.name } };
  }
}
