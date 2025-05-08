/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import { SettingsProvider } from "./providers/settings";

import type {
  SettingsProviderInputs,
  SettingsProviderOutputs,
} from "./providers/settings";

export namespace Workers {
  export type SettingsInputs = {
    [TKey in keyof SettingsProviderInputs]: $util.Input<
      SettingsProviderInputs[TKey]
    >;
  };

  export type SettingsOutputs = {
    [TKey in keyof SettingsProviderOutputs]: $util.Output<
      SettingsProviderOutputs[TKey]
    >;
  };

  export interface Settings extends SettingsOutputs {}
  export class Settings extends $util.dynamic.Resource {
    constructor(
      name: string,
      props: SettingsInputs,
      opts?: $util.CustomResourceOptions,
    ) {
      super(new SettingsProvider(), name, props, opts);
    }
  }
}
