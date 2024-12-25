import * as v from "valibot";

import { objectsTuple } from "../utils/shared";

export type SharedAccountPropertyTypeMap = {
  "access-groups": string;
  "access-users": string;
  "account-id": number;
  balance: number;
  "comment-option": string;
  disabled: boolean;
  "invoice-option": string;
  notes: string;
  "overdraft-amount": number;
  pin: string | number | boolean;
  restricted: boolean;
};

export const xmlRpcResponseTuple = <
  const TObjects extends Array<v.ObjectEntries>,
>(
  ...objects: TObjects
) =>
  objectsTuple(
    { "?xml": objectsTuple({ "#text": v.literal("") }) },
    { methodResponse: objectsTuple(...objects) },
  );
