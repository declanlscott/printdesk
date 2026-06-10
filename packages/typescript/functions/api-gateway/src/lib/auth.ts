import { Oauth } from "@printdesk/core/oauth/client";
import { Constants } from "@printdesk/core/utils/constants";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Redacted from "effect/Redacted";

import { lambda } from "./aws";
import { resource } from "./sst";

export const openauthRuntime = Oauth.Openauth.layer({
  clientID: Constants.OPENAUTH_CLIENT_IDS.API_GATEWAY,
  fetch: (input) => lambda.fetch(input),
  issuer: resource.Issuer.pipe(Redacted.value).url,
}).pipe(ManagedRuntime.make);
