import { buildTemplate } from "../../utils";

import type { Link } from "~/sst/link";

export interface BucketArgs {
  identifier: $util.Input<string>;
}

export class Bucket extends $util.ComponentResource implements Link.Linkable {
  public static readonly __pulumiType = "pd:templates:CloudflareR2Bucket";

  public readonly identifier: $util.Output<string>;
  public readonly name: $util.Output<string>;

  public constructor(name: string, args: BucketArgs, opts?: $util.ComponentResourceOptions) {
    super(Bucket.__pulumiType, name, {}, opts);

    this.identifier = $output(args.identifier);
    this.name = this.identifier.apply(buildTemplate);
  }

  public getSSTLink() {
    return {
      properties: {
        name: this.name,
        // oxlint-disable-next-line typescript/no-non-null-assertion
        endpoint: $interpolate`https://${cloudflare.getAccountsOutput().results[0]!.id}.r2.cloudflarestorage.com`,
      },
    };
  }
}
