import { Constants } from "@printdesk/core/utils/constants";
import { createFileRoute } from "@tanstack/react-router";
import * as Redacted from "effect/Redacted";

import { ViteResource } from "../lib/sst";

export const Route = createFileRoute("/")({
  component: function () {
    const api = ViteResource.useAtom("ReverseProxy").pipe(Redacted.value).urls.api;

    return (
      <div>
        <div>Hello "/"!</div>
        <div>{Constants.OPENAUTH_CLIENT_IDS.WEB}</div>
        <div>{api}</div>
      </div>
    );
  },
});
