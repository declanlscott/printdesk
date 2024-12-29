import { fn } from "@printworks/core/utils/shared";
import * as v from "valibot";

export const collectionItem = (name: string) => ({ name });

export const onSelectionChange = <
  TKeys extends Array<string> | Readonly<Array<string>>,
  TSchema extends v.PicklistSchema<TKeys, "">,
  TOnChange extends (output: v.InferOutput<TSchema>) => ReturnType<TOnChange>,
>(
  keys: TKeys,
  onChange: TOnChange,
) => fn(v.picklist(keys), onChange);
