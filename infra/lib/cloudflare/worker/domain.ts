import { DEFAULT_ACCOUNT_ID } from "~/sst/cloudflare";
import { ZoneLookup } from "~/sst/cloudflare/providers/zone-lookup";

export type WorkerDomainArgs = Pick<cloudflare.WorkersCustomDomainArgs, "hostname" | "service">;

export class WorkerDomain extends $util.ComponentResource {
  public static readonly __pulumiType = "pd:cloudflare:WorkerDomain";

  readonly #zoneLookup: ZoneLookup;
  readonly #domain: cloudflare.WorkersCustomDomain;

  public constructor(name: string, args: WorkerDomainArgs, opts?: $util.ComponentResourceOptions) {
    super(WorkerDomain.__pulumiType, name, {}, opts);

    this.#zoneLookup = new ZoneLookup(
      `${name}ZoneLookup`,
      {
        accountId: DEFAULT_ACCOUNT_ID,
        domain: args.hostname,
      },
      { parent: this },
    );

    this.#domain = new cloudflare.WorkersCustomDomain(`${name}WorkersCustomDomain`, {
      accountId: DEFAULT_ACCOUNT_ID,
      zoneId: this.#zoneLookup.zoneId,
      ...args,
    });
  }

  public get nodes() {
    return {
      zoneLookup: this.#zoneLookup,
      domain: this.#domain,
    };
  }

  public get url() {
    return $interpolate`https://${this.#domain.hostname}`;
  }
}
