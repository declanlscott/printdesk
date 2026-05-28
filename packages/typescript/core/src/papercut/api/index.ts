import * as Context from "effect/Context";
import * as Schema from "effect/Schema";

import { separatedString, StringFromUnknown } from "../../utils";

import type { ServiceShape } from "./layer";

const CommaSeparatedString = separatedString(",");

export const sharedAccountPropertySchemas = {
  "access-groups": CommaSeparatedString,
  "access-users": CommaSeparatedString,
  "account-id": Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0))),
  balance: Schema.Number,
  "comment-option": Schema.Literals(["NO_COMMENT", "COMMENT_REQUIRED", "COMMENT_OPTIONAL"]),
  disabled: Schema.Boolean,
  "invoice-option": Schema.Literals([
    "ALWAYS_INVOICE",
    "NEVER_INVOICE",
    "USER_CHOICE_ON",
    "USER_CHOICE_OFF",
  ]),
  notes: Schema.String,
  "overdraft-amount": Schema.Number,
  pin: StringFromUnknown,
  restricted: Schema.Boolean,
} as const;

export type SharedAccountPropertySchemas = typeof sharedAccountPropertySchemas;

export class SharedAccountBalanceAdjustmentFailure extends Schema.TaggedErrorClass<SharedAccountBalanceAdjustmentFailure>()(
  "SharedAccountBalanceAdjustmentFailure",
  {},
) {}

export class UserAndGroupSyncFailure extends Schema.TaggedErrorClass<UserAndGroupSyncFailure>()(
  "UserAndGroupSyncFailure",
  {},
) {}

export class PapercutApi extends Context.Service<PapercutApi, ServiceShape>()(
  "@printdesk/core/papercut/Api",
) {}
