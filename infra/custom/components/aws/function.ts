export class Function extends sst.aws.Function {
  constructor(
    name: string,
    props: sst.aws.FunctionArgs,
    opts?: $util.ComponentResourceOptions,
  ) {
    super(name, props, opts);
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

$transform(Function, (args) => {
  args.architecture ??= "arm64";
  args.runtime ??= "nodejs22.x";
});
