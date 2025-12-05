import type { Link } from "~/.sst/platform/src/components/link";

export type FunctionArgs = aws.cloudfront.FunctionArgs;

export class Function extends aws.cloudfront.Function implements Link.Linkable {
  constructor(
    name: string,
    args: FunctionArgs,
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
