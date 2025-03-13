import type { ComponentProps, ReactNode } from "react";
import type { Link as AriaLink } from "react-aria-components";
import type { Room } from "@printworks/core/rooms/sql";
import type { UserRole } from "@printworks/core/users/shared";
import type { EndsWith, StartsWith } from "@printworks/core/utils/types";
import type { RankingInfo } from "@tanstack/match-sorter-utils";
import type { MutationOptions as _MutationOptions } from "@tanstack/react-query";
import type {
  createRouter,
  NavigateOptions,
  ToOptions,
  TrailingSlashOption,
} from "@tanstack/react-router";
import type { FilterFn } from "@tanstack/react-table";
import type { RoutesById } from "@tanstack/router-core";
import type { Resource } from "sst";
import type { routeTree } from "~/routeTree.gen";

type ViteResourceKey<TKey extends keyof ImportMetaEnv> =
  TKey extends `VITE_RESOURCE_${infer TResourceKey}` ? TResourceKey : never;

export type ViteResource = {
  [TKey in keyof ImportMetaEnv as ViteResourceKey<TKey>]: ViteResourceKey<TKey> extends keyof Resource
    ? Omit<Resource[ViteResourceKey<TKey>], "type">
    : never;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}

declare module "react-aria-components" {
  interface RouterConfig {
    href: ToOptions;
    routerOptions: Omit<NavigateOptions, keyof ToOptions>;
  }
}

declare module "@tanstack/react-table" {
  interface FilterFns {
    fuzzy: FilterFn<unknown>;
  }
  interface FilterMeta {
    itemRank: RankingInfo;
  }
}

export type AppRouter = ReturnType<
  typeof createRouter<typeof routeTree, TrailingSlashOption, boolean>
>;

/** Deduplicate route ids, filtering out lazy routes from the union */
export type EagerRouteId<
  TRouteId extends string,
  TInput extends string = TRouteId,
> =
  TRouteId extends EndsWith<"/", TInput> // check if id ends with trailing slash
    ? TRouteId // if so, keep id with trailing slash
    : `${TRouteId}/` extends TInput // otherwise, check if id with trailing slash exists
      ? never // if so, remove id with trailing slash
      : TRouteId; // otherwise, keep id without trailing slash

export type AuthenticatedEagerRouteId = EagerRouteId<
  StartsWith<"/_authenticated/", keyof RoutesById<typeof routeTree>>
>;

export type RoutePath = Exclude<NonNullable<ToOptions["to"]>, "" | "." | "..">;

export type CommandBarPage =
  | { kind: "home" }
  | { kind: "room"; roomId: Room["id"] }
  | {
      kind: "room-settings-select-room";
      to: StartsWith<"/settings/rooms/$roomId", RoutePath>;
    }
  | {
      kind: "product-settings-select-room";
      to: StartsWith<"/settings/rooms/$roomId/products/$productId", RoutePath>;
    }
  | {
      kind: "product-settings-select-product";
      roomId: Room["id"];
      to: StartsWith<"/settings/rooms/$roomId/products/$productId", RoutePath>;
    };

export type MutationOptions = Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  () => _MutationOptions<any, any, any, any>
>;

export type ResolvedAppLink = {
  name: string;
  props: ComponentProps<typeof AriaLink>;
  icon: ReactNode;
};

export type AppLink =
  | ResolvedAppLink
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | ((...args: Array<any>) => ResolvedAppLink);

export type AppLinks = Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...args: Array<any>) => Record<UserRole, Array<AppLink>>
>;
