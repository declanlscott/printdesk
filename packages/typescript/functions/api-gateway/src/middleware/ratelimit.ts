import { AttributesContract } from "@printdesk/core/attributes/contract";
import * as Match from "effect/Match";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import { getConnInfo } from "hono/cloudflare-workers";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { resource } from "../lib/sst";

const encodeKey = Schema.Union([
  AttributesContract.IpFromString,
  AttributesContract.TenantClientIdFromString,
  AttributesContract.TenantUserIdFromString,
]).pipe(Schema.encodeSync);

export const ratelimit = createMiddleware(async function (c, next) {
  const { success } = await resource.RateLimit.pipe(Redacted.value).limit({ key: getKey() });
  if (!success) throw new HTTPException(429);

  return next();

  function getKey() {
    const subject = c.get("subject");
    if (!subject) return getKeyByIp();

    return Match.valueTags(subject, {
      ClientSubject: (client) => encodeKey({ tenantId: client.tenantId, clientId: client.id }),
      UserSubject: (user) => encodeKey({ tenantId: user.tenantId, userId: user.id }),
    });
  }

  function getKeyByIp() {
    const ip = getConnInfo(c).remote.address;
    if (!ip) throw new HTTPException(500, { message: "Missing remote IP" });

    return encodeKey(ip);
  }
});
