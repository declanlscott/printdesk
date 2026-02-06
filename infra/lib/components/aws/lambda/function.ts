export type FunctionArgs = sst.aws.FunctionArgs;

export class Function extends sst.aws.Function {
  constructor(
    name: string,
    args: sst.aws.FunctionArgs,
    opts?: $util.ComponentResourceOptions,
  ) {
    args.architecture ??= "arm64";
    args.runtime ??= "nodejs22.x";

    super(name, args, opts);
  }

  getSSTLink() {
    const link = super.getSSTLink();

    return {
      ...link,
      properties: {
        ...link.properties,
        arn: this.arn,
        invokeArn: this.nodes.function.invokeArn,
        roleArn: this.nodes.role.arn,
      },
    };
  }
}
