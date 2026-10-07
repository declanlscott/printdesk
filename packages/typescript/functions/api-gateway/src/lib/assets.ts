import * as Redacted from "effect/Redacted";

import { resource } from "./sst";

export const assets = resource.Assets.pipe(Redacted.value);
