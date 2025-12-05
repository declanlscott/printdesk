/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import { AuxiliaryBindingsProvider } from "./provider";

import type {
  AuxiliaryBindingsProviderInputs,
  AuxiliaryBindingsProviderOutputs,
} from "./provider";

type AuxiliaryBindingsInputs = {
  [TKey in keyof AuxiliaryBindingsProviderInputs]: $util.Input<
    AuxiliaryBindingsProviderInputs[TKey]
  >;
};

export type AuxiliaryBindingsArgs = AuxiliaryBindingsInputs;

type AuxiliaryBindingsOutputs = {
  [TKey in keyof AuxiliaryBindingsProviderOutputs]: $util.Output<
    AuxiliaryBindingsProviderOutputs[TKey]
  >;
};

export interface AuxiliaryBindings extends AuxiliaryBindingsOutputs {}
export class AuxiliaryBindings extends $util.dynamic.Resource {
  constructor(
    name: string,
    args: AuxiliaryBindingsArgs,
    opts?: $util.CustomResourceOptions,
  ) {
    super(
      new AuxiliaryBindingsProvider(),
      name,
      {
        ...args,
        createdOn: undefined,
        modifiedOn: undefined,
      },
      opts,
    );
  }
}
