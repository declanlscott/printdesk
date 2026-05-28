import { Constants } from "@printdesk/core/utils/constants";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: function () {
    return (
      <div>
        <div>Hello "/"!</div>
        <div>{Constants.OPENAUTH_CLIENT_IDS.WEB}</div>
      </div>
    );
  },
});
