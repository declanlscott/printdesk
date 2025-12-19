import * as Context from "effect/Context";
import * as Layer from "effect/Layer";

import { ActorsContract } from "./contract";

import type { ColumnsContract } from "../columns/contract";
import type { UsersContract } from "../users/contract";

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
            properties: new ActorsContract.PublicActor(),
          }),
        ),
      );

    static readonly systemLayer = (tenantId: ColumnsContract.TenantId) =>
      Layer.succeed(
        this,
        this.of(
          new ActorsContract.Actor({
            properties: new ActorsContract.SystemActor({ tenantId }),
          }),
        ),
      );

    static readonly userLayer = (
      id: ColumnsContract.EntityId,
      tenantId: ColumnsContract.TenantId,
      role: UsersContract.Role,
    ) =>
      Layer.succeed(
        this,
        this.of(
          new ActorsContract.Actor({
            properties: new ActorsContract.UserActor({ id, tenantId, role }),
          }),
        ),
      );
  }
}
