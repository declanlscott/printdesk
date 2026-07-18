import { ActorLayerMap } from "@printdesk/core/actors";
import { OauthContract } from "@printdesk/core/oauth/contract";
import * as Openauth from "@printdesk/core/oauth/openauth/layer";
import { Constants } from "@printdesk/core/utils/constants";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import { lambda } from "./aws";
import { resource } from "./sst";

export const authRuntime = Openauth.layer({
  clientID: Constants.OPENAUTH_CLIENT_IDS.PAPERCUT_MF_API_GATEWAY,
  fetch: (input) => lambda.fetch(input),
  issuer: resource.Issuer.pipe(Redacted.value).url,
}).pipe(Layer.merge(ActorLayerMap.layer), ManagedRuntime.make);

export const AuthHeaders = Schema.Struct({
  accessToken: OauthContract.CredentialFromBearerToken,
}).pipe(Schema.encodeKeys({ accessToken: "Proxy-Authorization" }));
