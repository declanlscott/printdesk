import * as Context from "effect/Context";
import * as Request from "effect/Request";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";

import { CustomerGroupsContract } from "../../groups/contracts";
import { SharedAccountsContract } from "../../shared-accounts/contracts";
import { UsersContract } from "../../users/contract";
import { separatedString, StringFromUnknown } from "../../utils";

import type { HttpClientError } from "effect/unstable/http/HttpClientError";
import type { HttpClientRequest } from "effect/unstable/http/HttpClientRequest";
import type { HttpClientResponse } from "effect/unstable/http/HttpClientResponse";
import type { Actor } from "../../actors";
import type { ActorsContract } from "../../actors/contract";
import type { Oauth } from "../../oauth";
import type { ServiceShape } from "./layer";

const CommaSeparatedString = separatedString(",");

export const sharedAccountPropertySchemas = {
  "access-groups": CommaSeparatedString.pipe(
    Schema.decodeTo(CustomerGroupsContract.Name.pipe(Schema.Array), {
      decode: SchemaGetter.passthrough(),
      encode: SchemaGetter.passthrough(),
    }),
  ),
  "access-users": CommaSeparatedString.pipe(
    Schema.decodeTo(UsersContract.Username.pipe(Schema.Array), {
      decode: SchemaGetter.passthrough(),
      encode: SchemaGetter.passthrough(),
    }),
  ),
  "account-id": SharedAccountsContract.PapercutId,
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

export class PapercutApiRequest extends Request.Class<
  HttpClientRequest,
  HttpClientResponse,
  ActorsContract.ForbiddenActorError | HttpClientError | Schema.SchemaError,
  Actor | Oauth.AccessToken
> {}

export class PapercutApi extends Context.Service<PapercutApi, ServiceShape>()(
  "@printdesk/core/papercut/Api",
) {}
