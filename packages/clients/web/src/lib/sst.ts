import { Sst } from "@printdesk/core/sst/client";
import * as Effect from "effect/Effect";

export class ViteResource extends Effect.Service<ViteResource>()(
  "@printdesk/clients/web/sst/ViteResource",
  { accessors: true, sync: Sst.makeViteResource },
) {}
