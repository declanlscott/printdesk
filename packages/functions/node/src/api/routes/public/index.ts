import { Hono } from "hono";

import realtimeRoute from "~/api/routes/public/realtime";
import tenantsRoute from "~/api/routes/public/tenants";

export default new Hono()
  .route("/realtime", realtimeRoute)
  .route("/tenants", tenantsRoute);
