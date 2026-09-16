import styles from "@printdesk/ui/styles/index.css?url";
import { colors } from "@printdesk/ui/styles/tokens.stylex";
import x from "@stylexjs/atoms";
import * as stylex from "@stylexjs/stylex";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

// oxlint-disable-next-line typescript/no-floating-promises
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
        <body
          {...stylex.props(x.backgroundColor(`light-dark(${colors.muted}, ${colors.background})`))}
        >
          <Outlet />
          <Scripts />
          <TanStackDevtools plugins={plugins} />
        </body>
      </html>
    );
  },
});
