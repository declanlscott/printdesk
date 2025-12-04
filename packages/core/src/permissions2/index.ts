import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
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

  const syncTablePermissions = Effect.sync(() =>
    Array.flatMap(Models.allSyncTables, Struct.get("permissions")),
  );

  const nonSyncTablePermissions = Effect.sync(() =>
    Array.flatMap(Models.allNonSyncTables, Struct.get("permissions")),
  );

  const syncViewPermissions = Effect.sync(() =>
    Array.map(Models.allSyncViews, Struct.get("permission")),
  );

  const externalPermissions = makeFromConfig({
    document_constraints: ["read", "update"],
    papercut_sync: ["create", "read"],
    // NOTE: proxy structure: protocol (https/http), fqdn (*.tailnet-*.ts.net), port, path (other than root /)
    papercut_tailscale_proxy: ["read", "update"],
    tailscale_oauth_client: ["update"],
  } as const);

  export const syncPermissions = Effect.all(
    Array.make(syncTablePermissions, syncViewPermissions),
  ).pipe(Effect.map(Array.flatten));
  export type SyncPermission = Effect.Effect.Success<
    typeof syncPermissions
  >[number];

  export const nonSyncPermissions = Effect.all(
    Array.make(nonSyncTablePermissions, externalPermissions),
  ).pipe(Effect.map(Array.flatten));
  export type NonSyncPermission = Effect.Effect.Success<
    typeof nonSyncPermissions
  >[number];

  export const permissions = Effect.all(
    Array.make(syncPermissions, nonSyncPermissions),
  ).pipe(Effect.map(Array.flatten));
  export type Permission = Effect.Effect.Success<typeof permissions>[number];

  const makeReadPermissions = <TPermissions extends Array<Permission>>(
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
  export type SyncReadPermission = Effect.Effect.Success<
    typeof syncReadPermissions
  >[number];

  export const nonSyncReadPermissions = nonSyncPermissions.pipe(
    Effect.map(makeReadPermissions),
  );
  export type NonSyncReadPermission = Effect.Effect.Success<
    typeof nonSyncReadPermissions
  >[number];

  export const readPermissions = Effect.all(
    Array.make(syncReadPermissions, nonSyncReadPermissions),
  ).pipe(Effect.map(Array.flatten));
  export type ReadPermission = Effect.Effect.Success<
    typeof readPermissions
  >[number];

  export const SyncPermission = syncPermissions.pipe(
    Effect.map((permissions) => Schema.Literal(...permissions)),
  );

  export const NonSyncPermission = nonSyncPermissions.pipe(
    Effect.map((permissions) => Schema.Literal(...permissions)),
  );

  export const Permission = permissions.pipe(
    Effect.map((permissions) => Schema.Literal(...permissions)),
  );

  export const SyncReadPermission = syncReadPermissions.pipe(
    Effect.map((permissions) => Schema.Literal(...permissions)),
  );

  export const NonSyncReadPermission = nonSyncReadPermissions.pipe(
    Effect.map((permissions) => Schema.Literal(...permissions)),
  );

  export const ReadPermission = readPermissions.pipe(
    Effect.map((permissions) => Schema.Literal(...permissions)),
  );
}
