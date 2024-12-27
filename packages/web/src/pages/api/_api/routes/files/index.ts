import { Hono } from "hono";

import { authn } from "~/api/middleware/auth";
import assets from "~/api/routes/files/assets";
import documents from "~/api/routes/files/documents";

export default new Hono()
  .use(authn)
  .route("/assets", assets)
  .route("/documents", documents);
