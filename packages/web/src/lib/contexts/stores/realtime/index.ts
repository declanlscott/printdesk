import { createContext } from "react";

import type { useWebSocket } from "partysocket/react";
import type ReconnectingWebSocket from "partysocket/ws";
import type { StoreApi } from "zustand/vanilla";

export type RealtimeStore = {
  isConnected: boolean;
  timer: NodeJS.Timeout | null;
  actions: {
    authenticate: (channel?: string) => Promise<Record<string, string>>;
    onConnection: (
      reconnect: ReconnectingWebSocket["reconnect"],
      timeoutMs: number,
    ) => void;
    onClose: () => void;
    cancelTimer: () => void;
  };
};

export type RealtimeContext = {
  storeApi: StoreApi<RealtimeStore>;
  webSocket: ReturnType<typeof useWebSocket>;
};

export const RealtimeContext = createContext<RealtimeContext | null>(null);
