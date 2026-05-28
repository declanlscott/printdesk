import { Hono } from "hono";
import { Resource } from "sst";

export default new Hono().use(async function (c) {
  const url = new URL(c.req.url);
  url.hostname = Resource.ApexDomain.value;

  return c.redirect(url.href, 301);
});
