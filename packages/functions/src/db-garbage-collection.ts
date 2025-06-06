import { Replicache } from "@printdesk/core/replicache";

import type { EventBridgeHandler } from "aws-lambda";

export const handler: EventBridgeHandler<string, unknown, void> = async () => {
  await Promise.all([
    Replicache.deleteExpiredClientGroups(),
    Replicache.deleteExpiredClients(),
  ]);
};
