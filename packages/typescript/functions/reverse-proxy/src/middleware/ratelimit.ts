import { AttributesContract } from "@printdesk/core/attributes/contract";
import { Oauth } from "@printdesk/core/oauth/client";
import { Constants } from "@printdesk/core/utils/constants";
import * as Exit from "effect/Exit";
import * as Match from "effect/Match";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import { getConnInfo } from "hono/cloudflare-workers";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { openauthRuntime } from "../lib/auth";
import { resource } from "../lib/sst";

const encodeKey = Schema.Union([
  AttributesContract.IpFromString,
  AttributesContract.TenantClientIdFromString,
  AttributesContract.TenantUserIdFromString,
]).pipe(Schema.encodeSync);

export const ratelimit = createMiddleware(async function (c, next) {
  const accessToken = getCookie(c, Constants.COOKIE_NAMES.ACCESS_TOKEN);

  const { success } = await resource.RateLimit.pipe(Redacted.value).limit({ key: await getKey() });
  if (!success) throw new HTTPException(429);

  return next();

  async function getKey() {
    if (!accessToken) return getKeyByIp();

    return Oauth.Openauth.use((openauth) => Redacted.make(accessToken).pipe(openauth.verify))
      .pipe(openauthRuntime.runPromiseExit)
      .then(
        Exit.match({
          onSuccess: (result) =>
            Match.value(result.subject.properties).pipe(
              Match.tagsExhaustive({
                ClientSubject: (client) =>
                  encodeKey({ tenantId: client.tenantId, clientId: client.id }),
                UserSubject: (user) => encodeKey({ tenantId: user.tenantId, userId: user.id }),
              }),
            ),
          onFailure: getKeyByIp,
        }),
      );
  }

  function getKeyByIp() {
    const ip = getConnInfo(c).remote.address;
    if (!ip) throw new HTTPException(500, { message: "Missing remote IP" });

    return encodeKey(ip);
  }
});
