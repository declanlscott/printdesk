import { use, useEffect } from "react";
import { ClientErrors } from "@printdesk/core/errors/client";
import { Realtime } from "@printdesk/core/realtime/client";
import { generateId } from "@printdesk/core/utils/shared";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { RealtimeContext } from "~/lib/contexts/stores/realtime";
import { useTrpc } from "~/lib/hooks/trpc";
import { useStableCallback } from "~/lib/hooks/utils";

import type { StartsWith } from "@printdesk/core/utils/types";

export function useRealtime() {
  const context = use(RealtimeContext);
  if (!context) throw new ClientErrors.MissingContextProvider("WebSocket");

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
  onEvent?: (event: unknown) => void,
  auth?: Record<string, string>,
) {
  const isConnected = useStore(
    useRealtime().storeApi,
    useShallow(({ isConnected }) => isConnected),
  );

  const trpc = useTrpc();

  const authorization = useQuery(
    trpc.realtime.getAuth.queryOptions(
      { channel },
      {
        initialData: auth,
        enabled: isConnected && !auth,
        staleTime: Infinity,
      },
    ),
  ).data;

  const webSocket = useRealtimeWebSocket();

  const handleEvent = useStableCallback(onEvent ?? (() => undefined));

  useEffect(() => {
    if (!isConnected || !authorization) return;

    const id = generateId();

    webSocket.send(
      JSON.stringify({ type: "subscribe", channel, id, authorization }),
    );
    const onMessage = Realtime.handleMessage((message) => {
      if (message.type === "data" && message.id === id)
        handleEvent(message.event);
    });
    webSocket.addEventListener("message", onMessage);

    return () => {
      webSocket.send(JSON.stringify({ type: "unsubscribe", id }));
      webSocket.removeEventListener("message", onMessage);
    };
  }, [isConnected, channel, webSocket, authorization, handleEvent]);
}
