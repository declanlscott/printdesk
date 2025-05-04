export const domainName = new sst.Secret("DomainName");

export const zone = cloudflare.getZoneOutput({ name: domainName.value });

export const fqdn =
  {
    production: domainName.value,
    dev: $interpolate`dev.${domainName.value}`,
  }[$app.stage] ?? $interpolate`dev-${$app.stage}.${domainName.value}`;
