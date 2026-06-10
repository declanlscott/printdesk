import { ActorLayerMap } from "@printdesk/core/actors";
import { Oauth } from "@printdesk/core/oauth/client";
import { Constants } from "@printdesk/core/utils/constants";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as Tuple from "effect/Tuple";

import { lambda } from "./aws";
import { resource } from "./sst";

export const authRuntime = Oauth.Openauth.layer({
  clientID: Constants.OPENAUTH_CLIENT_IDS.PAPERCUT_API_GATEWAY,
  fetch: (input) => lambda.fetch(input),
  issuer: resource.Issuer.pipe(Redacted.value).url,
}).pipe(Layer.merge(ActorLayerMap.layer), ManagedRuntime.make);

const bearerPrefix = "Bearer " as const;

export const AuthHeaders = Schema.Struct({
  accessToken: Schema.NonEmptyString.pipe(
    Schema.RedactedFromValue,
    Schema.encodeTo(
      Schema.TemplateLiteralParser([
        bearerPrefix,
        Schema.NonEmptyString.pipe(Schema.check(Schema.isBase64())),
      ]),
      {
        encode: SchemaGetter.transform((accessToken) => Tuple.make(bearerPrefix, accessToken)),
        decode: SchemaGetter.forbidden(() => "Not implemented"),
      },
    ),
  ),
}).pipe(Schema.encodeKeys({ accessToken: "Proxy-Authorization" }));
