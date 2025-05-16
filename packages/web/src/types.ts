import type { ComponentProps, ReactNode } from "react";
import type { Link as AriaLink } from "react-aria-components";
import type { Room } from "@printdesk/core/rooms/sql";
import type { Constants } from "@printdesk/core/utils/constants";
import type {
  EndsWith,
  Prettify,
  StartsWith,
} from "@printdesk/core/utils/types";
import type { TrpcRouter } from "@printdesk/functions/api/trpc/routers";
import type { RankingInfo } from "@tanstack/match-sorter-utils";
import type { QueryClient } from "@tanstack/react-query";
import type {
  createRouter,
  NavigateOptions,
  ToOptions,
} from "@tanstack/react-router";
import type { FilterFn } from "@tanstack/react-table";
import type { RoutesById } from "@tanstack/router-core";
import type { TRPCClient } from "@trpc/client";
import type { Resource } from "sst";
import type { StoreApi } from "zustand";
import type { ReplicacheContext } from "~/lib/contexts/replicache";
import type { ResourceContext } from "~/lib/contexts/resource";
import type { AuthStore } from "~/lib/contexts/stores/auth";
import type { routeTree } from "~/routeTree.gen";

type ViteResourceKey<TKey extends keyof ImportMetaEnv> =
  TKey extends `${typeof Constants.VITE_RESOURCE_PREFIX}${infer TResourceKey}`
    ? TResourceKey
    : never;

export type ViteResource = {
  [TKey in keyof ImportMetaEnv as ViteResourceKey<TKey>]: ViteResourceKey<TKey> extends keyof Resource
    ? Prettify<Omit<Resource[ViteResourceKey<TKey>], "type">>
    : never;
};

export type ReactRouter = ReturnType<
  typeof createRouter<typeof routeTree, "never", true>
>;

export type InitialRouterContext = {
  resource: ResourceContext;
  queryClient: QueryClient;
  authStoreApi: StoreApi<AuthStore>;
  replicache: ReplicacheContext;
  trpcClient: TRPCClient<TrpcRouter>;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReactRouter;
  }
}

declare module "react-aria-components" {
  interface RouterConfig {
    href: ToOptions;
    routerOptions: Prettify<Omit<NavigateOptions, keyof ToOptions>>;
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

export type ResolvedAppLink = {
  name: string;
  props: ComponentProps<typeof AriaLink>;
  icon: ReactNode;
};

export type AppLink =
  | ResolvedAppLink
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | ((...args: Array<any>) => ResolvedAppLink);
