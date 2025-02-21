import { Hono } from "hono";

import realtimeRoute from "~/api/routes/public/realtime";
import setupRoute from "~/api/routes/public/setup";
import tenantsRoute from "~/api/routes/public/tenants";

export default new Hono()
  .route("/realtime", realtimeRoute)
  .route("/setup", setupRoute)
  .route("/tenants", tenantsRoute);
