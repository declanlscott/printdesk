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

import type { Product } from "@printworks/core/products/sql";
import type { Room } from "@printworks/core/rooms/sql";
import type { AppLink, AppLinks } from "~/app/types";

const dashboardLink = {
  name: "Dashboard",
  props: { href: linkOptions({ to: "/dashboard" }) },
  icon: <LayoutDashboard />,
} satisfies AppLink;

const productsLinks = {
  name: "Products",
  props: { href: linkOptions({ to: "/products" }) },
  icon: <Package />,
} satisfies AppLink;

const usersLink = {
  name: "Users",
  props: { href: linkOptions({ to: "/users" }) },
  icon: <Users />,
} satisfies AppLink;

const settingsLink = {
  name: "Settings",
  props: { href: linkOptions({ to: "/settings" }) },
  icon: <Settings />,
} satisfies AppLink;

const settingsGeneralLink = {
  name: "General",
  props: { href: linkOptions({ to: "/settings" }) },
  icon: <Settings />,
} satisfies AppLink;

const settingsServicesLink = {
  name: "Integrations",
  props: { href: linkOptions({ to: "/settings/services" }) },
  icon: <Blocks />,
} satisfies AppLink;

const roomsSettingsLink = {
  name: "Rooms",
  props: { href: linkOptions({ to: "/settings/rooms" }) },
  icon: <Home />,
} satisfies AppLink;

const roomSettingsGeneralLink = ((roomId: Room["id"]) => ({
  name: "General",
  props: {
    href: linkOptions({ to: "/settings/rooms/$roomId", params: { roomId } }),
  },
  icon: <Settings />,
})) satisfies AppLink;

const roomSettingsConfigurationLink = ((roomId: Room["id"]) => ({
  name: "Configuration",
  props: {
    href: linkOptions({
      to: "/settings/rooms/$roomId/configuration",
      params: { roomId },
    }),
  },
  icon: <Wrench />,
})) satisfies AppLink;

const roomSettingsProductsLink = ((roomId: Room["id"]) => ({
  name: "Products",
  props: {
    href: linkOptions({
      to: "/settings/rooms/$roomId/products",
      params: { roomId },
    }),
  },
  icon: <Package />,
})) satisfies AppLink;

const roomSettingsCostScriptsLink = ((roomId: Room["id"]) => ({
  name: "Cost Scripts",
  props: {
    href: linkOptions({
      to: "/settings/rooms/$roomId/cost-scripts",
      params: { roomId },
    }),
  },
  icon: <DollarSign />,
})) satisfies AppLink;

const productSettingsLink = ((
  roomId: Room["id"],
  productId: Product["id"],
) => ({
  name: "",
  props: {
    href: linkOptions({
      to: "/settings/rooms/$roomId/products/$productId",
      params: { roomId, productId },
    }),
  },
  icon: <Settings />,
})) satisfies AppLink;

const imagesSettingsLink = {
  name: "Images",
  props: { href: linkOptions({ to: "/settings/images" }) },
  icon: <Image />,
} satisfies AppLink;

export const links = {
  mainNav: () => ({
    administrator: [dashboardLink, productsLinks, usersLink, settingsLink],
    operator: [dashboardLink, productsLinks, usersLink, settingsLink],
    manager: [dashboardLink, productsLinks, usersLink, settingsLink],
    customer: [dashboardLink, productsLinks, usersLink, settingsLink],
  }),
  settings: () => ({
    administrator: [
      settingsGeneralLink,
      settingsServicesLink,
      roomsSettingsLink,
      imagesSettingsLink,
    ],
    operator: [settingsGeneralLink, roomsSettingsLink, imagesSettingsLink],
    manager: [settingsGeneralLink],
    customer: [settingsGeneralLink],
  }),
  roomSettings: (roomId: Room["id"]) => ({
    administrator: [
      roomSettingsGeneralLink(roomId),
      roomSettingsConfigurationLink(roomId),
      roomSettingsProductsLink(roomId),
      roomSettingsCostScriptsLink(roomId),
    ],
    operator: [
      roomSettingsGeneralLink(roomId),
      roomSettingsConfigurationLink(roomId),
      roomSettingsProductsLink(roomId),
      roomSettingsCostScriptsLink(roomId),
    ],
    manager: [],
    customer: [],
  }),
  productSettings: (roomId: Room["id"], productId: Product["id"]) => ({
    administrator: [productSettingsLink(roomId, productId)],
    operator: [productSettingsLink(roomId, productId)],
    manager: [],
    customer: [],
  }),
} satisfies AppLinks;
