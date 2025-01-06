import { Hono } from "hono";

import papercut from "~/api/routes/services/papercut";
import tailscale from "~/api/routes/services/tailscale";

export default new Hono()
  .route("/papercut", papercut)
  .route("/tailscale", tailscale);
