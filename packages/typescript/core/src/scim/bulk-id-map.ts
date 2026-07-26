import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Layer from "effect/Layer";
import * as SynchronizedRef from "effect/SynchronizedRef";

import type { EntityId, NonEmptyString } from "../utils";

// @effect-leakable-service
export class ScimBulkIdMap extends Context.Service<ScimBulkIdMap>()(
  "@printdesk/core/scim/BulkIdMap",
  {
    make: Effect.gen(function* () {
      const ref = yield* SynchronizedRef.make(HashMap.empty<NonEmptyString, EntityId>());

      const get = Effect.fn("BulkIdMap.get")((bulkId: NonEmptyString) =>
        ref.pipe(SynchronizedRef.get, Effect.map(HashMap.get(bulkId))),
      );

      const set = Effect.fn("BulkIdMap.set")((bulkId: NonEmptyString, entityId: EntityId) =>
        ref.pipe(SynchronizedRef.update(HashMap.set(bulkId, entityId))),
      );

      return { get, set } as const;
    }),
  },
) {
  public static readonly layer = this.make.pipe(Layer.effect(this), Layer.fresh);
}
