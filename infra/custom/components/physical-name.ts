import {
  hashStringToPrettyString,
  prefixName,
} from "~/.sst/platform/src/components/naming";

export type PhysicalNameArgs = {
  max: number;
  suffix?: string;
};

export class PhysicalName extends $util.ComponentResource {
  private _main: $util.Output<string>;
  private _randomSuffix: $util.Output<string>;

  result: $util.Output<string>;

  constructor(
    name: string,
    args: PhysicalNameArgs,
    opts?: $util.ComponentResourceOptions,
  ) {
    super("pd:resource:PhysicalName", name, args, opts);

    const { max, suffix = "" } = args;

    this._main = $util.output(prefixName(max - 9 - suffix.length, name));

    this._randomSuffix = new random.RandomBytes(
      `${name}PhysicalNameRandomSuffix`,
      { length: 8 },
      { parent: this },
    ).hex.apply((hex) => hashStringToPrettyString(hex, 8));

    this.result = $interpolate`${this._main}-${this._randomSuffix}${suffix}`;

    this.registerOutputs({
      main: this._main,
      randomSuffix: this._randomSuffix,
      result: this.result,
    });
  }
}
