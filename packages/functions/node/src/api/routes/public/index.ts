import { Hono } from "hono";

import tenants from "~/api/routes/public/tenants";

export default new Hono().route("/tenants", tenants);
