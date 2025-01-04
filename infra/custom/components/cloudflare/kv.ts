export class Kv extends sst.cloudflare.Kv {
  constructor(
    name: string,
    props?: sst.cloudflare.KvArgs,
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
        namespaceId: this.id,
      },
    };
  }
}
