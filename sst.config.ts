/// <reference path="./.sst/platform/config.d.ts" />

import { readdirSync } from "fs";

const AWS_ORG_NAME = process.env.AWS_ORG_NAME;
if (!AWS_ORG_NAME) throw new Error("AWS_ORG_NAME is not set");

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
          profile:
            input?.stage === "production"
              ? `${AWS_ORG_NAME}-production`
              : `${AWS_ORG_NAME}-dev`,
          region: AWS_REGION as aws.Region,
        },
        awsx: { version: "2.19.0" },
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
    $transform(sst.aws.Function, (args) => {
      args.architecture ??= "arm64";
      args.runtime ??= "nodejs22.x";
    });

    const outputs = {};

    for (const dir of readdirSync("./infra")) {
      if (dir === "custom") continue;
      const infra = await import(`./infra/${dir}`);

      if (infra.outputs) Object.assign(outputs, infra.outputs);
    }

    return outputs;
  },
});
