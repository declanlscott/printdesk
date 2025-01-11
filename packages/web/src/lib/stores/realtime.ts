export type RealtimeStore = {
  isConnected: boolean;
  timer: NodeJS.Timeout | null;
  actions: {
    authenticate: (channel?: string) => Promise<Record<string, string>>;
    isConnected: (isConnected: boolean) => void;
    startTimer: (callback: () => void, delayMs: number) => void;
    cancelTimer: () => void;
  };
};
