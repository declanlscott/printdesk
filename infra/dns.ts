export const domainName = new sst.Secret("DomainName");

export const fqdn =
  {
    production: domainName.value,
    dev: $interpolate`dev.${domainName.value}`,
  }[$app.stage] ?? $interpolate`${$app.stage}.dev.${domainName.value}`;

export const apiFqdn = $interpolate`api.${fqdn}`;

export const authFqdn = $interpolate`auth.${fqdn}`;

export const zone = cloudflare.getZoneOutput({ name: domainName.value });
