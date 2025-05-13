/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import { AuxiliaryBindingsProvider } from "./providers/auxiliary-bindings";

import type {
  AuxiliaryBindingsProviderInputs,
  AuxiliaryBindingsProviderOutputs,
} from "./providers/auxiliary-bindings";

export namespace Workers {
  export type AuxiliaryBindingsInputs = {
    [TKey in keyof AuxiliaryBindingsProviderInputs]: $util.Input<
      AuxiliaryBindingsProviderInputs[TKey]
    >;
  };

  export type AuxiliaryBindingsOutputs = {
    [TKey in keyof AuxiliaryBindingsProviderOutputs]: $util.Output<
      AuxiliaryBindingsProviderOutputs[TKey]
    >;
  };

  export interface AuxiliaryBindings extends AuxiliaryBindingsOutputs {}
  export class AuxiliaryBindings extends $util.dynamic.Resource {
    constructor(
      name: string,
      props: AuxiliaryBindingsInputs,
      opts?: $util.CustomResourceOptions,
    ) {
      super(
        new AuxiliaryBindingsProvider(),
        name,
        {
          ...props,
          createdOn: undefined,
          modifiedOn: undefined,
        },
        opts,
      );
    }
  }
}
