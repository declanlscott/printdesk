import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";

import type { AnyRouter, RegisteredRouter } from "@tanstack/react-router";

export const useRouteApi = <
  const TId,
  TRouter extends AnyRouter = RegisteredRouter,
>(
  ...args: Parameters<typeof getRouteApi<TId, TRouter>>
) => useState(() => getRouteApi(...args))[0];
