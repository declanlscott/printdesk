import * as Context from "effect/Context";
import * as Redacted from "effect/Redacted";

import type { ClientInput, RefreshOptions, VerifyOptions } from "@openauthjs/openauth/client";
import type { ServiceShape } from "./layer";

export interface OpenauthClientInput extends Omit<ClientInput, "issuer"> {
  issuer: string;
}

export interface OpenauthRefreshOptions extends Omit<RefreshOptions, "access"> {
  access?: Redacted.Redacted<string>;
}

export interface OpenauthVerifyOptions extends Omit<VerifyOptions, "refresh"> {
  refresh?: Redacted.Redacted<string>;
}

export class Openauth extends Context.Service<Openauth, ServiceShape>()(
  "@printdesk/core/oauth/Openauth",
) {}
