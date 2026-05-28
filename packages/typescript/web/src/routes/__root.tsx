import { TanStackDevtools } from "@tanstack/react-devtools";
import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

const plugins = [{ name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> }];

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Printdesk" },
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
