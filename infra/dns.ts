export const rootDomain = new sst.Secret("RootDomain");

export const zone = cloudflare.getZoneOutput({ name: rootDomain.value });

const buildSubdomain = (identifier?: string) =>
  ({
    production: $output(identifier),
    dev: $interpolate`${identifier ? `${identifier}-` : ""}dev`,
  })[$app.stage] ??
  $interpolate`${identifier ? `${identifier}-` : ""}dev-${$app.stage}`;

const buildFqdn = (subdomain?: string) =>
  $interpolate`${subdomain ? `${subdomain}.` : ""}${rootDomain.value}`;

export const subdomains = {
  api: buildSubdomain("api"),
  auth: buildSubdomain("auth"),
  web: buildSubdomain(),
  www: buildSubdomain("www"),
};

export const domains = new sst.Linkable("Domains", {
  properties: {
    root: rootDomain.value,
    api: subdomains.api.apply(buildFqdn),
    auth: subdomains.auth.apply(buildFqdn),
    web: subdomains.web.apply(buildFqdn),
    www: subdomains.www.apply(buildFqdn),
  },
});
