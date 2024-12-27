import { Hono } from "hono";

import { authn } from "~/api/middleware/auth";
import papercut from "~/api/routes/services/papercut";
import tailscale from "~/api/routes/services/tailscale";

export default new Hono()
  .use(authn)
  .route("/papercut", papercut)
  .route("/tailscale", tailscale);
