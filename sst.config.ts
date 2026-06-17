// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

function requireEnvVar<TValue extends string = string>(key: string) {
  const value = process.env[key] as TValue | undefined;
  if (!value) throw new Error(`${key} is not set`);

  return value;
}

export default $config({
  app(input) {
    const awsRegion = requireEnvVar<aws.Region>("AWS_REGION");
    const cloudflareApiToken = requireEnvVar("CLOUDFLARE_API_TOKEN");

    return {
      name: "printdesk",
      removal: input?.stage === "prod" ? "retain" : "remove",
      protect: ["prod"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          profile: input?.stage === "prod" ? "prod" : "dev",
          region: awsRegion,
          version: "7.28.0",
        },
        azuread: { version: "6.9.0" },
        cloudflare: {
          apiToken: cloudflareApiToken,
          version: "6.15.0",
        },
        command: { version: "1.2.1" },
        docker: { version: "4.11.2" },
        random: { version: "4.19.2" },
        tls: { version: "5.3.1" },
        "@pulumiverse/time": { version: "0.1.1" },
      },
    };
  },
  async run() {
    const { readdir } = await import("node:fs/promises");
    const { Constants } = await import("@printdesk/core/utils/constants");
    const R = await import("remeda");

    sst.Linkable.wrap(aws.appconfig.Application, (app) => ({
      properties: { id: app.id, name: app.name, arn: app.arn },
    }));

    sst.Linkable.wrap(aws.appconfig.Environment, (env) => ({
      properties: { id: env.id, name: env.name, arn: env.arn },
    }));

    sst.Linkable.wrap(aws.appconfig.DeploymentStrategy, (strategy) => ({
      properties: { id: strategy.id, arn: strategy.arn },
    }));

    sst.Linkable.wrap(aws.appsync.Api, (api) => ({
      properties: {
        id: api.apiId,
        arn: api.apiArn,
        dns: {
          http: api.dns.apply((dns) => dns.HTTP),
          realtime: api.dns.apply((dns) => dns.REALTIME),
        },
      },
    }));

    sst.Linkable.wrap(aws.cloudfront.KeyGroup, (keyGroup) => ({
      properties: { id: keyGroup.id },
    }));

    sst.Linkable.wrap(aws.s3.BucketObjectv2, (object) => ({
      properties: { bucket: object.bucket, key: object.key },
      include: [sst.aws.permission({ actions: ["s3:GetObject"], resources: [object.arn] })],
    }));

    sst.Linkable.wrap(cloudflare.ZeroTrustAccessServiceToken, (token) => ({
      properties: {
        clientId: token.clientId,
        clientSecret: token.clientSecret,
      },
    }));

    sst.Linkable.wrap(sst.aws.Dsql, (dsql) => ({
      properties: {
        host: dsql.endpoint,
        port: 5432,
        database: "postgres",
        user: "admin",
        ssl: true,
      },
      include: [
        sst.aws.permission({
          actions: ["dsql:DbConnectAdmin"],
          resources: [dsql.nodes.cluster.arn],
        }),
      ],
    }));

    sst.Linkable.wrap(sst.aws.Dynamo, (dynamo) => ({
      properties: {
        name: dynamo.name,
        hashKey: dynamo.nodes.table.hashKey,
        rangeKey: dynamo.nodes.table.rangeKey,
        globalSecondaryIndexes: dynamo.nodes.table.globalSecondaryIndexes
          .apply(
            R.reduce(
              (indexes, gsi) => {
                indexes[gsi.name] = {
                  hashKey: gsi.hashKey,
                  rangeKey: gsi.rangeKey,
                };
                return indexes;
              },
              {} as Record<string, { hashKey: string; rangeKey?: string }>,
            ),
          )
          .apply((indexes) => (R.isEmpty(indexes) ? undefined : indexes)),
        keyLiterals: Constants.KEY_LITERALS,
      },
      include: [
        sst.aws.permission({
          actions: ["dynamodb:*"],
          resources: [dynamo.arn, $interpolate`${dynamo.arn}/*`],
        }),
      ],
    }));

    $transform(sst.aws.Function, (args) => {
      args.architecture ??= "arm64";
      args.runtime ??= "nodejs24.x";
    });

    sst.Linkable.wrap(sst.aws.Router, (router) => ({
      properties: {
        url: router.url,
        distributionId: router.distributionID,
        keyValueStoreArn: router._kvStoreArn,
        keyValueStoreNamespace: router._kvNamespace,
      },
    }));

    sst.Linkable.wrap(tls.PrivateKey, (privateKey) => ({
      properties: { pem: privateKey.privateKeyPem },
    }));

    const outputs = {};

    const dir = await readdir("./infra");
    for (const file of dir) {
      if (file === "lib") continue;
      // oxlint-disable-next-line no-await-in-loop
      const infra = await import(`./infra/${file}`);

      if (infra.outputs) Object.assign(outputs, infra.outputs);
    }

    return outputs;
  },
});
