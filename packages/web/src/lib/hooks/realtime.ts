import { useCallback, useEffect, useState } from "react";
import { ApplicationError } from "@printworks/core/utils/errors";
import { generateId } from "@printworks/core/utils/shared";
import { useWebSocket } from "partysocket/react";

import { useApi } from "~/lib/hooks/api";
import { useReplicache } from "~/lib/hooks/replicache";

export function useRealtime(channels: Array<string>) {
  const api = useApi();

  const [auth, setAuth] = useState<Record<string, string>>();

  const replicache = useReplicache();

  const protocolsProvider = useCallback(async () => {
    const res = await api.client.realtime.auth.$get();
    if (!res.ok)
      throw new ApplicationError.Error("Failed to get websocket auth protocol");

    const { auth } = await res.json();
    setAuth(auth);

    const header = Buffer.from(JSON.stringify(auth)).toString("base64");

    return ["aws-appsync-event-ws", `header-${header}`];
  }, [api]);

  const urlProvider = useCallback(async () => {
    const res = await api.client.realtime.url.$get();
    if (!res.ok)
      throw new ApplicationError.Error("Failed to get websocket url");

    const { url } = await res.json();

    return url;
  }, [api]);

  const socket = useWebSocket(urlProvider, protocolsProvider);

  useEffect(() => {
    if (!auth) return;

    const onOpen = (_event: WebSocketEventMap["open"]) =>
      socket.send(JSON.stringify({ type: "connection_init" }));
    const onMessage = (event: WebSocketEventMap["message"]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = JSON.parse(event.data as string) as any;
      if (data.type === "connection_ack") {
        for (const channel of channels)
          socket.send(
            JSON.stringify({
              type: "subscribe",
              id: generateId(),
              channel,
              authorization: auth,
            }),
          );

        return;
      }

      if (data === "poke") return void replicache.client.pull();
    };

    socket.addEventListener("open", onOpen);
    socket.addEventListener("message", onMessage);

    return () => {
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("message", onMessage);
    };
  }, [auth, socket, channels, replicache.client]);

  return socket;
}
