import * as Openauth from "@printdesk/core/oauth/openauth/layer";
import { Constants } from "@printdesk/core/utils/constants";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

import { ViteResource } from "./sst";

export const openauthLayer = ViteResource.useSync(
  (resource) => resource.ApiGateway.pipe(Redacted.value).urls.auth,
).pipe(
  Effect.map((issuer) => Openauth.layer({ clientID: Constants.OPENAUTH_CLIENT_IDS.WEB, issuer })),
  Layer.unwrap,
);
