export type RealtimeStore = {
  isConnected: boolean;
  timer: NodeJS.Timeout | null;
  actions: {
    authenticate: (channel?: string) => Promise<Record<string, string>>;
    onConnection: (reconnect: () => void, timeoutMs: number) => void;
    onClose: () => void;
    cancelTimer: () => void;
  };
};
