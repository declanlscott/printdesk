import { useCallback, useState } from "react";
import { Realtime } from "@printdesk/core/realtime/client";
import { useWebSocket } from "partysocket/react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { createStore } from "zustand/vanilla";

import { RealtimeContext } from "~/lib/contexts/stores/realtime";

import type { PropsWithChildren } from "react";
import type { UrlProvider } from "partysocket/ws";
import type { RealtimeStore } from "~/lib/contexts/stores/realtime";

export type WebSocketProviderProps = PropsWithChildren<{
  urlProvider: UrlProvider;
  getAuth: (channel?: string) => Promise<Record<string, string>>;
}>;

export function RealtimeProvider({
  urlProvider,
  getAuth,
  children,
}: WebSocketProviderProps) {
  const [storeApi] = useState(() =>
    createStore<RealtimeStore>((set, get) => ({
      isConnected: false,
      timer: null,
      actions: {
        authenticate: getAuth,
        onConnection: (reconnect, timeoutMs) => {
          set(() => ({
            isConnected: true,
            timer: setTimeout(reconnect, timeoutMs),
          }));
        },
        onClose: () => {
          get().actions.cancelTimer();

          set(() => ({ isConnected: false }));
        },
        cancelTimer: () =>
          set(({ timer }) => {
            if (timer) clearTimeout(timer);

            return { timer: null };
          }),
      },
    })),
  );

  const { authenticate, onConnection, onClose, cancelTimer } = useStore(
    storeApi,
    useShallow(({ actions }) => actions),
  );

  const protocolsProvider = useCallback(async () => {
    const auth = await authenticate();

    const header = btoa(JSON.stringify(auth))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    return ["aws-appsync-event-ws", `header-${header}`];
  }, [authenticate]);

  const webSocket = useWebSocket(urlProvider, protocolsProvider, {
    onOpen: () => webSocket.send(JSON.stringify({ type: "connection_init" })),
    onMessage: Realtime.handleMessage((message) => {
      switch (message.type) {
        case "connection_ack":
          return onConnection(
            () => webSocket.reconnect(),
            message.connectionTimeoutMs,
          );
        case "ka":
          return cancelTimer();
      }
    }),
    onClose,
  });

  return (
    <RealtimeContext.Provider value={{ storeApi, webSocket }}>
      {children}
    </RealtimeContext.Provider>
  );
}
