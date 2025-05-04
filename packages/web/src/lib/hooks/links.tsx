import { useCallback, useMemo } from "react";
import { linkOptions } from "@tanstack/react-router";
import {
  Blocks,
  DollarSign,
  Home,
  Image,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  Wrench,
} from "lucide-react";

import { useResource } from "~/lib/hooks/resource";
import { useSubdomain } from "~/lib/hooks/tenant";

import type { Product } from "@printdesk/core/products/sql";
import type { Room } from "@printdesk/core/rooms/sql";
import type { UserRole } from "@printdesk/core/users/shared";
import type { AppLink } from "~/types";

export function useNavLinks() {
  const subdomain = useSubdomain();
  const { AppData } = useResource();

  const dashboard = useMemo(
    () =>
      ({
        name: "Dashboard",
        props: {
          href: linkOptions({
            to: "/",
            search: {
              ...(AppData.isDevMode || !AppData.isProdStage
                ? { subdomain }
                : {}),
            },
          }),
        },
        icon: <LayoutDashboard />,
      }) satisfies AppLink,
    [AppData.isDevMode, AppData.isProdStage, subdomain],
  );

  const products = useMemo(
    () =>
      ({
        name: "Products",
        props: { href: linkOptions({ to: "/products" }) },
        icon: <Package />,
      }) satisfies AppLink,
    [],
  );

  const users = useMemo(
    () =>
      ({
        name: "Users",
        props: { href: linkOptions({ to: "/users" }) },
        icon: <Users />,
      }) satisfies AppLink,
    [],
  );

  const settings = useMemo(
    () =>
      ({
        name: "Settings",
        props: { href: linkOptions({ to: "/settings" }) },
        icon: <Settings />,
      }) satisfies AppLink,
    [],
  );

  const settingsGeneral = useMemo(
    () =>
      ({
        name: "General",
        props: { href: linkOptions({ to: "/settings" }) },
        icon: <Settings />,
      }) satisfies AppLink,
    [],
  );

  const settingsServices = useMemo(
    () =>
      ({
        name: "Integrations",
        props: { href: linkOptions({ to: "/settings/services" }) },
        icon: <Blocks />,
      }) satisfies AppLink,
    [],
  );

  const roomsSettings = useMemo(
    () =>
      ({
        name: "Rooms",
        props: { href: linkOptions({ to: "/settings/rooms" }) },
        icon: <Home />,
      }) satisfies AppLink,
    [],
  );

  const roomSettingsGeneral = useCallback(
    (roomId: Room["id"]) =>
      ({
        name: "General",
        props: {
          href: linkOptions({
            to: "/settings/rooms/$roomId",
            params: { roomId },
          }),
        },
        icon: <Settings />,
      }) satisfies AppLink,
    [],
  );

  const roomSettingsConfiguration = useCallback(
    (roomId: Room["id"]) =>
      ({
        name: "Configuration",
        props: {
          href: linkOptions({
            to: "/settings/rooms/$roomId/configuration",
            params: { roomId },
          }),
        },
        icon: <Wrench />,
      }) satisfies AppLink,
    [],
  );

  const roomSettingsProducts = useCallback(
    (roomId: Room["id"]) =>
      ({
        name: "Products",
        props: {
          href: linkOptions({
            to: "/settings/rooms/$roomId/products",
            params: { roomId },
          }),
        },
        icon: <Package />,
      }) satisfies AppLink,
    [],
  );

  const roomSettingsCostScripts = useCallback(
    (roomId: Room["id"]) =>
      ({
        name: "Cost Scripts",
        props: {
          href: linkOptions({
            to: "/settings/rooms/$roomId/cost-scripts",
            params: { roomId },
          }),
        },
        icon: <DollarSign />,
      }) satisfies AppLink,
    [],
  );

  const productSettings = useCallback(
    (roomId: Room["id"], productId: Product["id"]) =>
      ({
        name: "",
        props: {
          href: linkOptions({
            to: "/settings/rooms/$roomId/products/$productId",
            params: { roomId, productId },
          }),
        },
        icon: <Settings />,
      }) satisfies AppLink,
    [],
  );

  const imagesSettings = useMemo(
    () =>
      ({
        name: "Images",
        props: { href: linkOptions({ to: "/settings/images" }) },
        icon: <Image />,
      }) satisfies AppLink,
    [],
  );

  const mainNav = useMemo(
    () => ({
      administrator: [dashboard, products, users, settings],
      operator: [dashboard, products, users, settings],
      manager: [dashboard, products, users, settings],
      customer: [dashboard, products, users, settings],
    }),
    [dashboard, products, settings, users],
  );

  const settingsNav = useMemo(
    () => ({
      administrator: [
        settingsGeneral,
        settingsServices,
        roomsSettings,
        imagesSettings,
      ],
      operator: [settingsGeneral, roomsSettings, imagesSettings],
      manager: [settingsGeneral],
      customer: [settingsGeneral],
    }),
    [settingsGeneral, settingsServices, roomsSettings, imagesSettings],
  );

  const roomSettingsNav = useCallback(
    (roomId: Room["id"]) => ({
      administrator: [
        roomSettingsGeneral(roomId),
        roomSettingsConfiguration(roomId),
        roomSettingsProducts(roomId),
        roomSettingsCostScripts(roomId),
      ],
      operator: [
        roomSettingsGeneral(roomId),
        roomSettingsConfiguration(roomId),
        roomSettingsProducts(roomId),
        roomSettingsCostScripts(roomId),
      ],
      manager: [],
      customer: [],
    }),
    [
      roomSettingsGeneral,
      roomSettingsConfiguration,
      roomSettingsProducts,
      roomSettingsCostScripts,
    ],
  );

  const productSettingsNav = useCallback(
    (roomId: Room["id"], productId: Product["id"]) => ({
      administrator: [productSettings(roomId, productId)],
      operator: [productSettings(roomId, productId)],
      manager: [],
      customer: [],
    }),
    [productSettings],
  );

  return {
    mainNav,
    settingsNav,
    roomSettingsNav,
    productSettingsNav,
  } satisfies Record<
    string,
    | Record<UserRole, Array<AppLink>>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | ((...args: Array<any>) => Record<UserRole, Array<AppLink>>)
  >;
}
