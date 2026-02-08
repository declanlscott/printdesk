import type { Link } from "~/sst/link";

export type RotatingArgs = time.RotatingArgs;

export class Rotating extends time.Rotating implements Link.Linkable {
  constructor(
    name: string,
    args: RotatingArgs,
    opts?: $util.ComponentResourceOptions,
  ) {
    super(name, args, opts);
  }

  getSSTLink(): Link.Definition<{ id: $util.Output<string> }> {
    return {
      properties: {
        id: this.id,
      },
    };
  }
}
