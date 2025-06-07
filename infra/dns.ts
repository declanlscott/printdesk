import { Constants } from "@printdesk/core/utils/constants";
import * as R from "remeda";

export const rootDomain = new sst.Secret("RootDomain");

export const zone = new sst.Linkable("Zone", {
  properties: {
    id: cloudflare
      .getZoneOutput({ filter: { name: rootDomain.value } })
      .apply(({ zoneId }) => zoneId!),
    name: rootDomain.value,
  },
});

const buildSubdomain = <
  TMaybeIdentifier extends string | undefined,
  TWithTenantId extends boolean,
>(
  identifier?: TMaybeIdentifier,
  withTenantId: TWithTenantId = false as TWithTenantId,
) =>
  ((
    ({
      production: [identifier],
      dev: [identifier, "dev"],
    })[$app.stage] ?? [identifier, "dev", $app.stage]
  )
    .toSpliced(1, 0, withTenantId ? Constants.TENANT_ID_PLACEHOLDER : undefined)
    .filter(Boolean)
    .join("-") || undefined) as TMaybeIdentifier extends string
    ? string
    : TWithTenantId extends true
      ? string
      : string | undefined;

const buildFqdn = (subdomain?: string) =>
  rootDomain.value.apply((rootDomain) =>
    [subdomain, rootDomain].filter(Boolean).join("."),
  );

export const subdomains = {
  api: buildSubdomain("api"),
  auth: buildSubdomain("auth"),
  realtime: buildSubdomain("realtime"),
  web: buildSubdomain(),
  www: buildSubdomain("www"),
};

export const domains = new sst.Linkable("Domains", {
  properties: {
    root: rootDomain.value,
    ...R.pipe(
      subdomains,
      R.entries(),
      R.mapToObj(([name, subdomain]) => [name, buildFqdn(subdomain)]),
    ),
  },
});

export const tenantSubdomainTemplates = {
  api: buildSubdomain("api", true),
  files: buildSubdomain("files", true),
  realtime: buildSubdomain("realtime", true),
};

export const tenantDomains = new sst.Linkable("TenantDomains", {
  properties: R.pipe(
    tenantSubdomainTemplates,
    R.entries(),
    R.mapToObj(([name, subdomainTemplate]) => [
      name,
      { nameTemplate: buildFqdn(subdomainTemplate) },
    ]),
  ),
});
