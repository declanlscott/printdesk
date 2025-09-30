import { Array, Effect, Option, Record, Schema, Struct } from "effect";

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
    Effect.map(Array.flatMap((table) => table.permissions)),
  );

  const nonSyncTable = Models.NonSyncTables.pipe(
    Effect.map(Struct.omit("_tag")),
    Effect.map(Record.values),
    Effect.map(Array.flatMap((table) => table.permissions)),
  );

  const view = Models.Views.pipe(
    Effect.map(Struct.omit("_tag")),
    Effect.map(Record.values),
    Effect.map(Array.map((view) => view.permission)),
  );

  const external = makeFromConfig({
    document_constraints: ["read", "update"],
    papercut_sync: ["create", "read"],
    // NOTE: proxy structure: protocol (https/http), fqdn (*.tailnet-*.ts.net), port, path (other than root /)
    papercut_tailscale_proxy: ["read", "update"],
    tailscale_oauth_client: ["update"],
  } as const);

  export const permissions = Effect.all(
    Array.make(syncTable, nonSyncTable, view, external),
  ).pipe(Effect.map(Array.flatten));
  export type Permissions = Effect.Effect.Success<typeof permissions>;

  export const readPermissions = permissions.pipe(
    Effect.map(
      Array.filterMap((permission) =>
        permission.endsWith(":read")
          ? Option.some(
              permission as {
                [TPermission in Permissions[number]]: TPermission extends `${string}:read`
                  ? TPermission
                  : never;
              }[Permissions[number]],
            )
          : Option.none(),
      ),
    ),
  );
  export type ReadPermissions = Effect.Effect.Success<typeof readPermissions>;

  export class Schemas extends Effect.Service<Schemas>()(
    "@printdesk/core/permissions/Schemas",
    {
      accessors: true,
      dependencies: [
        Models.SyncTables.Default,
        Models.NonSyncTables.Default,
        Models.Views.Default,
      ],
      effect: Effect.all({
        Permission: permissions.pipe(
          Effect.map((permissions) => Schema.Literal(...permissions)),
        ),
        ReadPermission: readPermissions.pipe(
          Effect.map((permissions) => Schema.Literal(...permissions)),
        ),
      }),
    },
  ) {}

  export type Permission = Effect.Effect.Success<
    typeof Schemas
  >["Permission"]["Type"];

  export type ReadPermission = Effect.Effect.Success<
    typeof Schemas
  >["ReadPermission"]["Type"];
}
