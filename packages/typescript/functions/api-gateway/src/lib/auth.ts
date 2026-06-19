import { Openauth } from "@printdesk/core/oauth/openauth";
import { Constants } from "@printdesk/core/utils/constants";
import * as Redacted from "effect/Redacted";

import { lambda } from "./aws";
import { resource } from "./sst";

export const openauthRuntime = Openauth.Openauth.runtime({
  clientID: Constants.OPENAUTH_CLIENT_IDS.API_GATEWAY,
  fetch: (input) => lambda.fetch(input),
  issuer: resource.Issuer.pipe(Redacted.value).url,
});
