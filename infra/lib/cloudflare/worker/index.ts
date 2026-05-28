import { mkdirSync, writeFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";

import * as R from "remeda";

import { WorkerDomain } from "./domain";

import { siteBuilder } from "~/sst/aws/helpers/site-builder";
import { binding } from "~/sst/cloudflare";
import { VisibleError } from "~/sst/error";
import { Link } from "~/sst/link";

export interface WorkerArgs extends Omit<sst.cloudflare.WorkerArgs, "domain"> {
  domains?: $util.Input<Record<string, $util.Input<string>>>;
}

// TODO: Modify as needed
type Configuration = {
  $schema: string;
  name: string;
  compatibility_date?: string;
  compatibility_flags?: Array<string>;
  main?: string;
  vars?: Record<string, string>;
  ratelimits?: Array<{
    name: string;
    namespace_id: string;
    simple: {
      limit: number;
      period: number;
    };
  }>;
};

export class Worker extends $util.ComponentResource implements Link.Linkable {
  public static readonly __pulumiType = "pd:cloudflare:Worker";

  #worker: sst.cloudflare.Worker;
  #domains: $util.Output<Record<string, WorkerDomain> | undefined>;

  public constructor(
    name: string,
    { domains, ...args }: WorkerArgs,
    opts?: $util.ComponentResourceOptions,
  ) {
    super(Worker.__pulumiType, name, {}, opts);

    this.#worker = new sst.cloudflare.Worker(`${name}Worker`, args, { parent: this });

    this.#domains = $output(domains).apply((domains) =>
      domains
        ? R.mapValues(
            domains,
            (value, key) =>
              new WorkerDomain(
                `${name}${key.charAt(0).toUpperCase() + key.slice(1)}Domain`,
                { service: this.#worker.nodes.worker.scriptName, hostname: value },
                { parent: this },
              ),
          )
        : undefined,
    );

    const bindings = this.#worker.nodes.worker.bindings.apply(
      // @ts-expect-error Pulumi type is incorrect
      (bindings) => bindings.value as Array<cloudflare.types.output.WorkersScriptBinding>,
    );

    $resolve({
      config: $jsonStringify(
        $resolve({
          name: this.#worker.nodes.worker.scriptName,
          bindings,
          compatibility_date: this.#worker.nodes.worker.compatibilityDate,
        }).apply(({ name, bindings, compatibility_date }) =>
          bindings.reduce(
            (cfg, binding) => {
              // TODO: Add other bindings as needed
              switch (binding.type) {
                case "plain_text":
                  cfg.vars ??= {};
                  cfg.vars[binding.name] = binding.text || "";
                  break;
                case "ratelimit":
                  cfg.ratelimits ??= [];
                  cfg.ratelimits.push({
                    name: binding.name,
                    namespace_id: binding.namespaceId,
                    // oxlint-disable-next-line typescript/no-non-null-assertion
                    simple: binding.simple!,
                  });
                  break;
                default:
                  break;
              }

              return cfg;
            },
            {
              $schema: "node_modules/wrangler/config-schema.json",
              name,
              compatibility_date,
            } as Configuration,
          ),
        ),
        undefined,
        2,
      ),
      path: $output(args.handler).apply((handler) =>
        findPackagePath(resolve(join($cli.paths.root, handler))),
      ),
      secrets: bindings.apply((bindings) =>
        bindings
          .filter((binding) => binding.type === "secret_text")
          .map((binding) => `${binding.name}='${binding.text || ""}'`)
          .join("\n"),
      ),
    }).apply(({ config, path, secrets }) => {
      const configPath = resolve(join(path, "wrangler.jsonc"));
      mkdirSync(dirname(configPath), { recursive: true });
      writeFileSync(configPath, config);

      const secretsPath = resolve(join(path, ".dev.vars"));
      mkdirSync(dirname(secretsPath), { recursive: true });
      writeFileSync(secretsPath, secrets);

      siteBuilder(
        `${name}Typegen`,
        {
          create: "vpx wrangler types",
          dir: path,
          triggers: [$util.secret(secrets)],
        },
        { parent: this },
      );
    });

    function findPackagePath(path: string) {
      if (existsSync(join(path, "package.json"))) return path;

      const parent = dirname(path);
      if (parent === path)
        throw new VisibleError(`Arrived at root, could not find ${name}'s package.json`);

      return findPackagePath(parent);
    }
  }

  public get urls() {
    return this.#domains.apply((domains) =>
      domains ? R.mapValues(domains, R.prop("url")) : undefined,
    );
  }

  public get nodes() {
    return {
      worker: this.#worker,
      domains: this.#domains,
    };
  }

  public get binding() {
    return binding({
      type: "serviceBindings",
      properties: {
        service: this.#worker.nodes.worker.id,
      },
    });
  }

  public getSSTLink() {
    return {
      properties: {
        urls: this.urls,
      },
    };
  }
}
