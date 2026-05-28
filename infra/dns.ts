import { Constants } from "@printdesk/core/utils/constants";
import { ZoneLookup } from "~/sst/cloudflare/providers/zone-lookup";

import { cloudflare_, isProdStage } from "./utils";

export const apexDomain = new sst.Secret("ApexDomain");

const buildHostname = (identifier?: string) =>
  apexDomain.value.apply((apex) =>
    [
      (
        { prod: [identifier], dev: [identifier, "dev"] }[$app.stage] ?? [
          identifier,
          "dev",
          $app.stage,
        ]
      )
        .filter(Boolean)
        .join("-"),
      apex,
    ]
      .filter(Boolean)
      .join("."),
  );

export const hostnames = new sst.Linkable("Hostnames", {
  properties: {
    api: buildHostname("api"),
    auth: buildHostname("auth"),
    assets: buildHostname("assets"),
    papercutApiTemplate: buildHostname(`pcapi-${Constants.TENANT_ID_PLACEHOLDER}`), // base32 encoded id
    realtime: buildHostname("realtime"),
    web: buildHostname(isProdStage ? "*" : undefined),
    www: buildHostname(isProdStage ? undefined : "www"),
  },
});

export const zoneLookup = new ZoneLookup("ZoneLookup", {
  accountId: cloudflare_.properties.account.id,
  domain: apexDomain.value,
});

export const zone = new sst.Linkable("Zone", {
  properties: { id: zoneLookup.zoneId, name: zoneLookup.zoneName },
});
