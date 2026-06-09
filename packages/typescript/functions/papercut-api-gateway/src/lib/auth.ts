import { ActorLayerMap } from "@printdesk/core/actors";
import { Oauth } from "@printdesk/core/oauth/client";
import { Constants } from "@printdesk/core/utils/constants";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Redacted from "effect/Redacted";

import { lambda } from "./aws";
import { resource } from "./sst";

export const authRuntime = Oauth.Openauth.layer({
  clientID: Constants.OPENAUTH_CLIENT_IDS.PAPERCUT_API_GATEWAY,
  fetch: lambda.fetch,
  issuer: resource.Issuer.pipe(Redacted.value).url,
}).pipe(Layer.merge(ActorLayerMap.layer), ManagedRuntime.make);
