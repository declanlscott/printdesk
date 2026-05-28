import { makeResource } from "@printdesk/core/sst/client/resource";
import { Constants } from "@printdesk/core/utils/constants";
import { env } from "cloudflare:workers";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export class ViteResource extends Context.Service<ViteResource>()(
  "@printdesk/web/bff/sst/ViteResource",
  { make: Effect.sync(() => makeResource({ env, prefix: Constants.VITE_RESOURCE_PREFIX })) },
) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}
