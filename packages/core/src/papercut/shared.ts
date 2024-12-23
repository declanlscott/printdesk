import * as v from "valibot";

import { objectsTuple } from "../utils/shared";

export const xmlRpcResponseTuple = <
  const TObjects extends Array<v.ObjectEntries>,
>(
  ...objects: TObjects
) =>
  objectsTuple(
    { "?xml": objectsTuple({ "#text": v.literal("") }) },
    { methodResponse: objectsTuple(...objects) },
  );
