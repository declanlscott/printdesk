import { Link as AriaLink, composeRenderProps } from "react-aria-components";
import { createLazyFileRoute } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { SettingsLayout } from "~/layouts/settings";
import { query } from "~/lib/hooks/data";
import { useSubscribe } from "~/lib/hooks/replicache";
import { useUser } from "~/lib/hooks/user";
import { links } from "~/lib/links";
import { buttonStyles } from "~/styles/components/primitives/button";
import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  Breadcrumbs,
  BreadcrumbSeparator,
} from "~/ui/primitives/breadcrumbs";

export const Route = createLazyFileRoute(
  "/_authenticated/settings_/rooms/$roomId",
)({ component: RouteComponent });

function RouteComponent() {
  const { roomId } = Route.useParams();
  const room = useSubscribe(query.room(roomId));

  const user = useUser();

  return (
    <SettingsLayout
      header={
        <>
          <div className="flex items-center gap-2">
            <AriaLink
              href={{ to: "/settings/rooms" }}
              className={composeRenderProps("", (_, renderProps) =>
                buttonStyles({
                  variant: "ghost",
                  size: "icon",
                  ...renderProps,
                }),
              )}
              aria-label="Back to Rooms"
            >
              <ChevronLeft />
            </AriaLink>

            <h1 className="text-3xl font-semibold">Room Settings</h1>
          </div>

          <Breadcrumbs>
            <BreadcrumbItem>
              <BreadcrumbLink href={{ to: "/settings/rooms" }}>
                Rooms
              </BreadcrumbLink>

              <BreadcrumbSeparator />
            </BreadcrumbItem>

            <BreadcrumbItem>
              <BreadcrumbPage>{room?.name ?? "Room"}</BreadcrumbPage>
            </BreadcrumbItem>
          </Breadcrumbs>
        </>
      }
      links={links.roomSettings(roomId)[user.role]}
    />
  );
}
