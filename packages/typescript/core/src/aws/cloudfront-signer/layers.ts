import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

import { CloudfrontSigner } from ".";
import { SstResource } from "../../sst/resource";

export const assetsLayer = SstResource.pipe(
  Effect.map(({ AssetsKeyGroup, AssetsPrivateKey }) =>
    CloudfrontSigner.layer({
      keyPairId: AssetsKeyGroup.pipe(Redacted.value).id,
      privateKey: AssetsPrivateKey.pipe(Redacted.value).pem,
    }),
  ),
  Layer.unwrap,
);
