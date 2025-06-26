import { Constants } from "@printdesk/core/utils/constants";
import {
  createTRPCClient,
  httpBatchLink,
  httpLink,
  splitLink,
} from "@trpc/client";

import type { NanoId } from "@printdesk/core/utils/shared";
import type { StartsWith } from "@printdesk/core/utils/types";
import type { TrpcRouter } from "@printdesk/functions/api/trpc/routers";

export function createTrpcClient<TBearerToken extends string>(
  url: URL,
  bearerToken?: StartsWith<"Bearer ", TBearerToken>,
  tenantId?: NanoId,
) {
  const linkOptions = {
    url,
    headers: {
      ...(bearerToken ? { Authorization: bearerToken } : {}),
      ...(tenantId ? { [Constants.HEADER_KEYS.TENANT_ID]: tenantId } : {}),
    },
  };

  return createTRPCClient<TrpcRouter>({
    links: [
      splitLink({
        condition: (operation) => Boolean(operation.context.skipBatch),
        true: httpLink(linkOptions),
        false: httpBatchLink(linkOptions),
      }),
    ],
  });
}
