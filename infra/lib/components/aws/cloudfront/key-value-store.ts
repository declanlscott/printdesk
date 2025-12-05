import type { Link } from "~/.sst/platform/src/components/link";

export type KeyValueStoreArgs = aws.cloudfront.KeyValueStoreArgs;

export class KeyValueStore
  extends aws.cloudfront.KeyValueStore
  implements Link.Linkable
{
  constructor(
    name: string,
    args: KeyValueStoreArgs = {},
    opts?: $util.CustomResourceOptions,
  ) {
    super(name, args, opts);
  }

  getSSTLink(): Link.Definition<{
    arn: $util.Output<string>;
  }> {
    return {
      properties: {
        arn: this.arn,
      },
    };
  }
}
