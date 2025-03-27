import { createTRPCContext } from "@trpc/tanstack-react-query";

import type { Router } from "@printworks/functions/api/trpc/routers";

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<Router>();
