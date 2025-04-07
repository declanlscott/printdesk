import { createTRPCContext } from "@trpc/tanstack-react-query";

import type { TrpcRouter } from "@printworks/functions/api/trpc/routers";

export const TrpcContext = createTRPCContext<TrpcRouter>();
