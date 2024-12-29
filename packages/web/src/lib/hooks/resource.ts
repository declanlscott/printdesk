import { useRouteContext } from "@tanstack/react-router";

export const useResource = () =>
  useRouteContext({
    from: "__root__",
    select: (ctx) => ctx.resource,
  });
