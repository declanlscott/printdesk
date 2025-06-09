export class Vpc extends sst.aws.Vpc {
  constructor(
    name: string,
    props: sst.aws.VpcArgs,
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
        id: this.id,
        cloudMapNamespaceId: this.nodes.cloudmapNamespace.id,
      },
    };
  }
}
