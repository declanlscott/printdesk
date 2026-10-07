import * as Context from "effect/Context";
import * as Redacted from "effect/Redacted";

import type { ClientInput, RefreshOptions, VerifyOptions } from "@openauthjs/openauth/client";
import type { ServiceShape } from "./layer";

export interface OpenauthClientInput extends Omit<ClientInput, "issuer"> {
  issuer: NonNullable<ClientInput["issuer"]>;
}

export interface OpenauthRefreshOptions extends Omit<RefreshOptions, "access"> {
  access?: Redacted.Redacted;
}

export interface OpenauthVerifyOptions extends Omit<VerifyOptions, "refresh"> {
  refresh?: Redacted.Redacted;
}

export class Openauth extends Context.Service<Openauth, ServiceShape>()(
  "@printdesk/core/oauth/Openauth",
) {
  public static readonly verify = (...args: Parameters<(typeof this)["Service"]["verify"]>) =>
    this.use((openauth) => openauth.verify(...args));

  public static readonly clientCredentials = (
    ...args: Parameters<(typeof this)["Service"]["clientCredentials"]>
  ) => this.use((openauth) => openauth.clientCredentials(...args));
}
