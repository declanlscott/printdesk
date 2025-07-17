import type { AccessControl } from ".";

export type PermissionAction = "create" | "read" | "update" | "delete";

export type PermissionsConfig = Record<string, ReadonlyArray<PermissionAction>>;

export type InferPermissionsFromConfig<TConfig extends PermissionsConfig> = {
  [TResource in keyof TConfig]: TConfig[TResource][number] extends PermissionAction
    ? `${TResource & string}:${TConfig[TResource][number]}`
    : never;
}[keyof TConfig];

export const makePermissionsFromConfig = <TConfig extends PermissionsConfig>(
  config: TConfig,
) =>
  Object.entries(config).flatMap(([resource, actions]) =>
    actions.map(
      (action) =>
        `${resource}:${action}` as InferPermissionsFromConfig<TConfig>,
    ),
  );

export type Permission = AccessControl.Permission;
