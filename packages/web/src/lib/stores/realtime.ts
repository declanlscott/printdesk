import type ReconnectingWebSocket from "partysocket/ws";

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
