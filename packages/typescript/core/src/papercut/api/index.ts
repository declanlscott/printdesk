import * as Context from "effect/Context";
import * as Request from "effect/Request";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { CustomerGroupsContract } from "../../groups/contracts";
import { SharedAccountsContract } from "../../shared-accounts/contracts";
import { UsersContract } from "../../users/contract";
import { separatedString, StringFromUnknown } from "../../utils";

import type { HttpClientError } from "effect/unstable/http/HttpClientError";
import type { HttpClientRequest } from "effect/unstable/http/HttpClientRequest";
import type { HttpClientResponse } from "effect/unstable/http/HttpClientResponse";
import type { Oauth } from "../../oauth";
import type { OauthContract } from "../../oauth/contract";
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

export class SharedAccountBalanceAdjustmentFailure extends Schema.TaggedErrorClass<SharedAccountBalanceAdjustmentFailure>()(
  "SharedAccountBalanceAdjustmentFailure",
  {},
) {}

export class UserAndGroupSyncFailure extends Schema.TaggedErrorClass<UserAndGroupSyncFailure>()(
  "UserAndGroupSyncFailure",
  {},
) {}

export class IncompleteTaskStatusError
  extends Schema.TaggedErrorClass<IncompleteTaskStatusError>()("IncompleteTaskStatusError", {
    message: Schema.String,
  })
  implements HttpServerRespondable.Respondable
{
  public [HttpServerRespondable.symbol] = () =>
    HttpServerResponse.schemaJson(IncompleteTaskStatusError)(this, { status: 503 });
}

export class PapercutApiRequest extends Request.Class<
  HttpClientRequest,
  HttpClientResponse,
  | OauthContract.InvalidAccessTokenError
  | OauthContract.InvalidRefreshTokenError
  | OauthContract.VerifyError
  | HttpClientError,
  Oauth.AccessToken
> {}

export class PapercutApi extends Context.Service<PapercutApi, ServiceShape>()(
  "@printdesk/core/papercut/Api",
) {}
