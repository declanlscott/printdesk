import * as Context from "effect/Context";
import * as Layer from "effect/Layer";

import { ActorsContract } from "./contract";

import type { ColumnsContract } from "../columns/contract";

export namespace Actors {
  export class Actor extends Context.Tag("@printdesk/core/actors/Actor")<
    Actor,
    ActorsContract.Actor
  >() {
    static readonly publicLayer = () =>
      Layer.succeed(
        this,
        this.of(
          new ActorsContract.Actor({
            properties: new ActorsContract.Public(),
          }),
        ),
      );

    static readonly systemLayer = (tenantId: ColumnsContract.TenantId) =>
      Layer.succeed(
        this,
        this.of(
          new ActorsContract.Actor({
            properties: new ActorsContract.System({ tenantId }),
          }),
        ),
      );

    static readonly userLayer = (
      id: ColumnsContract.EntityId,
      tenantId: ColumnsContract.TenantId,
    ) =>
      Layer.succeed(
        this,
        this.of(
          new ActorsContract.Actor({
            properties: new ActorsContract.User({ id, tenantId }),
          }),
        ),
      );
  }
}
