import * as Array from "effect/Array";
import * as Record from "effect/Record";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";
import * as String from "effect/String";
import * as Struct from "effect/Struct";

import { Models } from "../models";

export namespace Permissions {
  export const separator = ":";
  export type Separator = typeof separator;

  export const Action = Schema.Literals(["create", "read", "update", "delete"]);
  export type Action = typeof Action.Type;

  export type Config = Record<string, ReadonlyArray<Action>>;

  export type InferFromConfig<TConfig extends Config> = {
    [TResource in keyof TConfig]: TConfig[TResource][number] extends Action
      ? `${TResource & string}${Separator}${TConfig[TResource][number]}`
      : never;
  }[keyof TConfig];

  const makeFromConfig = <const TConfig extends Config>(config: TConfig) =>
    Array.flatMap(Record.toEntries(config), ([resource, actions]) =>
      Array.map(
        actions,
        (action) => Array.join([resource, action], separator) as InferFromConfig<TConfig>,
      ),
    );

  const syncTablePermissions = Array.flatMap(Models.syncTables, Struct.get("permissions"));

  const nonSyncTablePermissions = Array.flatMap(Models.nonSyncTables, Struct.get("permissions"));

  const syncViewPermissions = Array.map(Models.syncViews, Struct.get("permission"));

  const externalPermissions = makeFromConfig({
    cloudflare_tunnel_tokens: ["read"],
    document_constraints: ["read", "update"],
    papercut_api_gateway: ["read", "update"],
    papercut_sync: ["create", "read", "update"],
  });

  export const syncPermissions = Array.flatten([syncTablePermissions, syncViewPermissions]);
  export type SyncPermission = (typeof syncPermissions)[number];

  export const nonSyncPermissions = Array.flatten([nonSyncTablePermissions, externalPermissions]);
  export type NonSyncPermission = (typeof nonSyncPermissions)[number];

  export const permissions = Array.flatten([syncPermissions, nonSyncPermissions]);
  export type Permissions = typeof permissions;

  export type Resource = {
    readonly [TPermission in Permissions[number]]: TPermission extends `${infer TResource}:${Action}`
      ? TResource
      : never;
  }[Permissions[number]];

  export const Permission = Schema.Literals(permissions).pipe(
    Schema.decodeTo(
      Schema.Struct({
        resource: Schema.Literals(
          Array.map(
            permissions,
            (permission) => String.split(permission, separator)[0] as Resource,
          ),
        ),
        action: Action,
      }),
      SchemaTransformation.transform({
        decode: (permission) => {
          const [resource, action] = String.split(permission, separator) as [Resource, Action];

          return { resource, action };
        },
        encode: ({ resource, action }) =>
          Array.join([resource, action], separator) as Permissions[number],
      }),
    ),
  );
  export type Permission = typeof Permission.Encoded;

  const makeReadPermissions = <TPermissions extends Array<Permission>>(permissions: TPermissions) =>
    Array.filterMap(permissions, (permission) =>
      String.endsWith(`${separator}read`)(permission)
        ? Result.succeed(
            permission as {
              readonly [TPermission in TPermissions[number]]: TPermission extends `${string}${Separator}read`
                ? TPermission
                : never;
            }[TPermissions[number]],
          )
        : Result.failVoid,
    );

  export const syncReadPermissions = makeReadPermissions(syncPermissions);
  export type SyncReadPermission = (typeof syncReadPermissions)[number];

  export const nonSyncReadPermissions = makeReadPermissions(nonSyncPermissions);
  export type NonSyncReadPermission = (typeof nonSyncReadPermissions)[number];

  export const readPermissions = Array.flatten([syncReadPermissions, nonSyncReadPermissions]);
  export type ReadPermission = (typeof readPermissions)[number];
}
