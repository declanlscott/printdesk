import { useCallback, useEffect, useState } from "react";
import { handleMessage } from "@printworks/core/realtime/client";
import { useWebSocket } from "partysocket/react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { createStore } from "zustand/vanilla";

import { RealtimeContext } from "~/lib/contexts/realtime";

import type { PropsWithChildren } from "react";
import type { UrlProvider } from "partysocket/ws";
import type { RealtimeStore } from "~/lib/stores/realtime";

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
    createStore<RealtimeStore>((set) => ({
      isConnected: false,
      timer: null,
      actions: {
        authenticate: getAuth,
        isConnected: (isConnected) => set(() => ({ isConnected })),
        startTimer: (callback, delayMs) =>
          set(() => ({
            timer: setTimeout(callback, delayMs),
          })),
        cancelTimer: () =>
          set(({ timer }) => {
            if (timer) clearTimeout(timer);

            return { timer: null };
          }),
      },
    })),
  );

  const { authenticate, isConnected, startTimer, cancelTimer } = useStore(
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

  const webSocket = useWebSocket(urlProvider, protocolsProvider);

  useEffect(() => {
    const onOpen = (_event: WebSocketEventMap["open"]) =>
      webSocket.send(JSON.stringify({ type: "connection_init" }));
    const onMessage = handleMessage((data) => {
      switch (data.type) {
        case "connection_ack":
          isConnected(true);
          startTimer(() => webSocket.reconnect(), data.connectionTimeoutMs);
          break;
        case "ka":
          cancelTimer();
          break;
      }
    });
    const onClose = (_event: WebSocketEventMap["close"]) => isConnected(false);

    webSocket.addEventListener("open", onOpen);
    webSocket.addEventListener("message", onMessage);
    webSocket.addEventListener("close", onClose);

    return () => {
      webSocket.removeEventListener("open", onOpen);
      webSocket.removeEventListener("message", onMessage);
      webSocket.removeEventListener("close", onClose);
    };
  }, [webSocket, isConnected, startTimer, cancelTimer]);

  return (
    <RealtimeContext.Provider value={{ storeApi, webSocket: webSocket }}>
      {children}
    </RealtimeContext.Provider>
  );
}
