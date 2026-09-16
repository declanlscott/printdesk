import { makeResource } from "@printdesk/core/sst/client/resource";
import { env } from "cloudflare:workers";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export class SstResource extends Context.Service<SstResource>()("@printdesk/assets/sst/Resource", {
  make: Effect.sync(() => makeResource({ env })),
}) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}
