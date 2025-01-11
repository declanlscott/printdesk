import { useContext, useEffect, useRef } from "react";
import { handleMessage } from "@printworks/core/realtime/client";
import { ApplicationError } from "@printworks/core/utils/errors";
import { generateId } from "@printworks/core/utils/shared";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { RealtimeContext } from "~/lib/contexts/realtime";

import type { StartsWith } from "@printworks/core/utils/types";

export function useRealtime() {
  const context = useContext(RealtimeContext);

  if (!context) throw new ApplicationError.MissingContextProvider("WebSocket");

  return context;
}

export const useRealtimeWebSocket = () => useRealtime().webSocket;

export const useRealtimeActions = () =>
  useStore(
    useRealtime().storeApi,
    useShallow(({ actions }) => actions),
  );

export function useRealtimeChannel<TChannel extends string>(
  channel: StartsWith<"/", TChannel>,
  onData: (event: unknown) => void,
) {
  const onDataRef = useRef(onData);

  useEffect(() => {
    onDataRef.current = onData;
  }, [onData]);

  const isConnected = useStore(
    useRealtime().storeApi,
    useShallow(({ isConnected }) => isConnected),
  );
  const { authenticate } = useRealtimeActions();

  const { data: authorization } = useQuery({
    queryKey: ["realtime", "auth", channel],
    queryFn: async () => authenticate(channel),
    staleTime: Infinity,
    enabled: isConnected,
  });

  const webSocket = useRealtimeWebSocket();

  useEffect(() => {
    if (!isConnected || !authorization) return;

    const id = generateId();

    webSocket.send(
      JSON.stringify({ type: "subscribe", channel, id, authorization }),
    );
    const onMessage = handleMessage((message) => {
      if (message.type === "data" && message.id === id)
        onDataRef.current(message.event);
    });
    webSocket.addEventListener("message", onMessage);

    return () => {
      webSocket.send(JSON.stringify({ type: "unsubscribe", id }));
      webSocket.removeEventListener("message", onMessage);
    };
  }, [isConnected, channel, webSocket, authorization]);
}
