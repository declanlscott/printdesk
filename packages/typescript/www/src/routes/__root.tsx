import styles from "@printdesk/ui/styles/index.css?url";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

if (import.meta.env.DEV && typeof document !== "undefined") import("virtual:stylex:css-only");

const plugins = [{ name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> }];

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Printdesk" },
    ],
    links: [
      { rel: "stylesheet", href: styles },
      ...(import.meta.env.DEV ? [{ rel: "stylesheet", href: "/virtual:stylex.css" }] : []),
    ],
  }),
  component: function () {
    return (
      <html>
        <head>
          <HeadContent />
        </head>
        <body>
          <Outlet />
          <Scripts />
          <TanStackDevtools plugins={plugins} />
        </body>
      </html>
    );
  },
});
