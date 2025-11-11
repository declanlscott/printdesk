import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";
import * as String from "effect/String";
import * as Struct from "effect/Struct";

import { Models } from "../models2";

export namespace Permissions {
  export type Action = "create" | "read" | "update" | "delete";

  export type Config = Record<string, ReadonlyArray<Action>>;

  export type InferFromConfig<TConfig extends Config> = {
    [TResource in keyof TConfig]: TConfig[TResource][number] extends Action
      ? `${TResource & string}:${TConfig[TResource][number]}`
      : never;
  }[keyof TConfig];

  const makeFromConfig = <TConfig extends Config>(config: TConfig) =>
    Effect.sync(() =>
      Array.flatMap(Struct.entries(config), ([resource, actions]) =>
        Array.map(
          actions,
          (action) => `${resource}:${action}` as InferFromConfig<TConfig>,
        ),
      ),
    );

  const syncTable = Models.SyncTables.pipe(
    Effect.map(Struct.omit("_tag")),
    Effect.map(Record.values),
    Effect.map(Array.flatMap(Struct.get("permissions"))),
  );

  const nonSyncTable = Models.NonSyncTables.pipe(
    Effect.map(Struct.omit("_tag")),
    Effect.map(Record.values),
    Effect.map(Array.flatMap(Struct.get("permissions"))),
  );

  const syncView = Models.SyncViews.pipe(
    Effect.map(Struct.omit("_tag")),
    Effect.map(Record.values),
    Effect.map(Array.map(Struct.get("permission"))),
  );

  const external = makeFromConfig({
    document_constraints: ["read", "update"],
    papercut_sync: ["create", "read"],
    // NOTE: proxy structure: protocol (https/http), fqdn (*.tailnet-*.ts.net), port, path (other than root /)
    papercut_tailscale_proxy: ["read", "update"],
    tailscale_oauth_client: ["update"],
  } as const);

  export const syncPermissions = Effect.all(
    Array.make(syncTable, syncView),
  ).pipe(Effect.map(Array.flatten));
  export type SyncPermissions = Effect.Effect.Success<typeof syncPermissions>;
  export type SyncPermission = SyncPermissions[number];

  export const nonSyncPermissions = Effect.all(
    Array.make(nonSyncTable, external),
  ).pipe(Effect.map(Array.flatten));
  export type NonSyncPermissions = Effect.Effect.Success<
    typeof nonSyncPermissions
  >;
  export type NonSyncPermission = NonSyncPermissions[number];

  export const permissions = Effect.all(
    Array.make(syncPermissions, nonSyncPermissions),
  ).pipe(Effect.map(Array.flatten));
  export type Permissions = Effect.Effect.Success<typeof permissions>;
  export type Permission = Permissions[number];

  const makeReadPermissions = <TPermissions extends Permissions>(
    permissions: TPermissions,
  ) =>
    Array.filterMap(permissions, (permission) =>
      String.endsWith(":read")(permission)
        ? Option.some(
            permission as {
              [TPermission in TPermissions[number]]: TPermission extends `${string}:read`
                ? TPermission
                : never;
            }[TPermissions[number]],
          )
        : Option.none(),
    );

  export const syncReadPermissions = syncPermissions.pipe(
    Effect.map(makeReadPermissions),
  );
  export type SyncReadPermissions = Effect.Effect.Success<
    typeof syncReadPermissions
  >;
  export type SyncReadPermission = SyncReadPermissions[number];

  export const nonSyncReadPermissions = nonSyncPermissions.pipe(
    Effect.map(makeReadPermissions),
  );
  export type NonSyncReadPermissions = Effect.Effect.Success<
    typeof nonSyncReadPermissions
  >;
  export type NonSyncReadPermission = NonSyncReadPermissions[number];

  export const readPermissions = Effect.all(
    Array.make(syncReadPermissions, nonSyncReadPermissions),
  ).pipe(Effect.map(Array.flatten));
  export type ReadPermissions = Effect.Effect.Success<typeof readPermissions>;
  export type ReadPermission = ReadPermissions[number];

  export class Schemas extends Effect.Service<Schemas>()(
    "@printdesk/core/permissions/Schemas",
    {
      accessors: true,
      dependencies: [
        Models.SyncTables.Default,
        Models.NonSyncTables.Default,
        Models.SyncViews.Default,
      ],
      effect: Effect.all({
        SyncPermission: syncPermissions.pipe(
          Effect.map((permissions) => Schema.Literal(...permissions)),
        ),
        NonSyncPermission: nonSyncPermissions.pipe(
          Effect.map((permissions) => Schema.Literal(...permissions)),
        ),
        Permission: permissions.pipe(
          Effect.map((permissions) => Schema.Literal(...permissions)),
        ),
        SyncReadPermission: syncReadPermissions.pipe(
          Effect.map((permissions) => Schema.Literal(...permissions)),
        ),
        NonSyncReadPermission: nonSyncReadPermissions.pipe(
          Effect.map((permissions) => Schema.Literal(...permissions)),
        ),
        ReadPermission: readPermissions.pipe(
          Effect.map((permissions) => Schema.Literal(...permissions)),
        ),
      }),
    },
  ) {}
}
