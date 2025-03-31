// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

const AWS_REGION = process.env.AWS_REGION;
if (!AWS_REGION) throw new Error("AWS_REGION is not set");

export default $config({
  app(input) {
    return {
      name: "printworks",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          profile: input?.stage === "production" ? "prod" : "dev",
          region: AWS_REGION as aws.Region,
        },
        awsx: true,
        cloudflare: true,
        azuread: true,
        "@pulumiverse/time": true,
        tls: true,
        random: true,
        command: true,
      },
      version: ">= 3.0.1",
    };
  },
  async run() {
    const { readdirSync } = await import("node:fs");

    $transform(sst.aws.Function, (args) => {
      args.architecture ??= "arm64";
      args.runtime ??= "nodejs22.x";
    });

    const outputs = {};

    const dir = readdirSync("./infra");
    for (const file of dir) {
      if (file === "custom") continue;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const infra = await import(`./infra/${file}`);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (infra.outputs) Object.assign(outputs, infra.outputs);
    }

    return outputs;
  },
});
