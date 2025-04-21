import { createTRPCContext } from "@trpc/tanstack-react-query";

import type { TrpcRouter } from "@printdesk/functions/api/trpc/routers";

export const TrpcContext = createTRPCContext<TrpcRouter>();
