import { useAtomValue } from "@effect/atom-react";
import { NetworkMonitor } from "@printdesk/core/network/client/monitor";
import { createFileRoute } from "@tanstack/react-router";
import * as Redacted from "effect/Redacted";

import { ViteResource } from "../lib/sst";

export const Route = createFileRoute("/")({
  component: function () {
    const api = ViteResource.useAtom("ApiGateway").pipe(Redacted.value).urls.api;

    const online = useAtomValue(NetworkMonitor.onlineAtom);

    return (
      <div>
        <div>{'Hello "/"!'}</div>
        <div>{api}</div>
        <div>{JSON.stringify(online)}</div>
      </div>
    );
  },
});
