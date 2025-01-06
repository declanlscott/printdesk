import { Hono } from "hono";

import assets from "~/api/routes/files/assets";
import documents from "~/api/routes/files/documents";

export default new Hono()
  .route("/assets", assets)
  .route("/documents", documents);
