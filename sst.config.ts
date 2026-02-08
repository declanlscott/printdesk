// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    const AWS_REGION = process.env.AWS_REGION;
    if (!AWS_REGION) throw new Error("AWS_REGION is not set");

    return {
      name: "printdesk",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: input?.stage === "production",
      home: "aws",
      providers: {
        aws: {
          profile: input?.stage === "production" ? "prod" : "dev",
          region: AWS_REGION as aws.Region,
          version: "6.83.2",
        },
        awsx: true,
        azuread: true,
        cloudflare: { version: "6.13.0" },
        command: { version: "1.1.3" },
        random: { version: "4.19.1" },
        tls: { version: "5.3.0" },
        "@pulumiverse/time": true,
      },
    };
  },
  async run() {
    const { readdir } = await import("node:fs/promises");

    $transform(sst.aws.Function, (args) => {
      args.architecture ??= "arm64";
      args.runtime ??= "nodejs22.x";
    });

    const outputs = {};

    const dir = await readdir("./infra");
    for (const file of dir) {
      if (file === "lib") continue;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const infra = await import(`./infra/${file}`);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (infra.outputs) Object.assign(outputs, infra.outputs);
    }

    return outputs;
  },
});
