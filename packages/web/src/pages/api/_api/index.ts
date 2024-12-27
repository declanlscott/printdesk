import { HttpError } from "@printworks/core/utils/errors";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";

import auth from "~/api/routes/auth";
import files from "~/api/routes/files";
import realtime from "~/api/routes/realtime";
import replicache from "~/api/routes/replicache";
import services from "~/api/routes/services";
import tenants from "~/api/routes/tenants";
import users from "~/api/routes/users";

import type { StatusCode } from "hono/utils/http-status";

const api = new Hono()
  .basePath("/api/")
  .use(logger())
  .route("/auth", auth)
  .route("/files", files)
  .route("/services", services)
  .route("/tenants", tenants)
  .route("/realtime", realtime)
  .route("/replicache", replicache)
  .route("/users", users)
  .onError((e, c) => {
    console.error(e);

    if (e instanceof HttpError.Error)
      return c.json(e.message, e.statusCode as StatusCode);
    if (e instanceof HTTPException) return e.getResponse();

    return c.json("Internal server error", 500);
  });

export default api;

export type Api = typeof api;
