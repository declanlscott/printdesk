import * as BrowserCrypto from "@effect/platform-browser/BrowserCrypto";
import * as Layer from "effect/Layer";

export const realtimeEventAtomLayer = Layer.mergeAll(BrowserCrypto.layer);
