export type ValueArgs<TValue> = {
  value: $util.Input<TValue>;
};

export class Value<TValue> extends $util.ComponentResource {
  value: $util.Input<TValue>;

  constructor(
    name: string,
    args: ValueArgs<TValue>,
    opts?: $util.ComponentResourceOptions,
  ) {
    super("pw:resource:Value", name, args, opts);

    this.value = args.value;
  }

  get() {
    return $util.output(this.value);
  }
}
