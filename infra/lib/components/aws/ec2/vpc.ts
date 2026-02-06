export type VpcArgs = sst.aws.VpcArgs;

export class Vpc extends sst.aws.Vpc {
  constructor(
    name: string,
    props: sst.aws.VpcArgs = {},
    opts?: $util.ComponentResourceOptions,
  ) {
    super(name, props, opts);
  }

  override getSSTLink() {
    const link = super.getSSTLink();

    return {
      ...link,
      properties: {
        ...link.properties,
        id: this.id,
        cidrBlock: this.nodes.vpc.cidrBlock,
        cloudMapNamespaceId: this.nodes.cloudmapNamespace.id,
        cloudMapNamespaceName: this.nodes.cloudmapNamespace.name,
      },
    };
  }
}
