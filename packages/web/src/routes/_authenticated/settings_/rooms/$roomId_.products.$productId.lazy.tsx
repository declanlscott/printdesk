import { Link as AriaLink, composeRenderProps } from "react-aria-components";
import { createLazyFileRoute, Outlet } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { query } from "~/lib/hooks/data";
import { useSubscribe } from "~/lib/hooks/replicache";
import { buttonStyles } from "~/styles/components/primitives/button";
import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  Breadcrumbs,
  BreadcrumbSeparator,
} from "~/ui/primitives/breadcrumbs";

export const Route = createLazyFileRoute(
  "/_authenticated/settings_/rooms/$roomId_/products/$productId",
)({ component: Component });

function Component() {
  const { roomId } = Route.useParams();

  const room = useSubscribe(query.room(roomId));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
      <header className="grid gap-2">
        <div className="flex items-center gap-2">
          <AriaLink
            href={{
              to: "/settings/rooms/$roomId/products",
              params: { roomId },
            }}
            className={composeRenderProps("", (_, renderProps) =>
              buttonStyles({
                variant: "ghost",
                size: "icon",
                ...renderProps,
              }),
            )}
            aria-label="Back to Products"
          >
            <ChevronLeft />
          </AriaLink>

          <h1 className="text-3xl font-semibold">Product Settings</h1>
        </div>

        <Breadcrumbs>
          <BreadcrumbItem>
            <BreadcrumbLink href={{ to: "/settings/rooms" }}>
              Rooms
            </BreadcrumbLink>

            <BreadcrumbSeparator />
          </BreadcrumbItem>

          <BreadcrumbItem>
            <BreadcrumbLink
              href={{ to: "/settings/rooms/$roomId", params: { roomId } }}
            >
              {room?.name ?? "Room"}
            </BreadcrumbLink>

            <BreadcrumbSeparator />
          </BreadcrumbItem>

          <BreadcrumbItem>
            <BreadcrumbLink
              href={{
                to: "/settings/rooms/$roomId/products",
                params: { roomId },
              }}
            >
              Products
            </BreadcrumbLink>

            <BreadcrumbSeparator />
          </BreadcrumbItem>

          <BreadcrumbItem>
            <BreadcrumbPage>Product</BreadcrumbPage>
          </BreadcrumbItem>
        </Breadcrumbs>
      </header>

      <Outlet />
    </div>
  );
}
