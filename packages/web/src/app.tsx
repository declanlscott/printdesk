import { useState } from "react";
import { createRouter } from "@tanstack/react-router";

import { routeTree } from "~/routeTree.gen";

export function App() {
  const [router] = useState(() =>
    createRouter({
      routeTree,
      context: {},
    }),
  );

  // Hide the initial loading indicator
  // Router will handle the loading indicator afterwards with `defaultPendingComponent`
  document
    .getElementById("initial-app-loading-indicator")
    ?.style.setProperty("display", "none");

  return <>TODO</>;
}
