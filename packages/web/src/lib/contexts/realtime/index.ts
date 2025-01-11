import { createContext } from "react";

import type { useWebSocket } from "partysocket/react";
import type { StoreApi } from "zustand/vanilla";
import type { RealtimeStore } from "~/lib/stores/realtime";

export type RealtimeContext = {
  storeApi: StoreApi<RealtimeStore>;
  webSocket: ReturnType<typeof useWebSocket>;
};

export const RealtimeContext = createContext<RealtimeContext | null>(null);
