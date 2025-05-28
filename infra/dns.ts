import * as R from "remeda";

export const rootDomain = new sst.Secret("RootDomain");

export const zoneId = cloudflare
  .getZoneOutput({ filter: { name: rootDomain.value } })
  .apply(({ zoneId }) => zoneId!);

const buildSubdomain = <TMaybeIdentifier extends string | undefined>(
  identifier?: TMaybeIdentifier,
) =>
  ((
    ({
      production: [identifier],
      dev: [identifier, "dev"],
    })[$app.stage] ?? [identifier, "dev", $app.stage]
  )
    .filter(Boolean)
    .join("-") || undefined) as TMaybeIdentifier extends string
    ? string
    : string | undefined;

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
      R.mapToObj(([name, subdomain]) => [
        name,
        rootDomain.value.apply((rootDomain) =>
          [subdomain, rootDomain].filter(Boolean).join("."),
        ),
      ]),
    ),
  },
});
