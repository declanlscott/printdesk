import * as aws from "@pulumi/aws";
import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";
import * as R from "remeda";

import { useResource } from "../resource";

export interface SslArgs {
  tenantId: pulumi.Input<string>;
}

export class Ssl extends pulumi.ComponentResource {
  private static _instance: Ssl;

  private _certificate: aws.acm.Certificate;
  private _records: Array<cloudflare.Record> = [];

  static getInstance(
    args: SslArgs,
    opts: pulumi.ComponentResourceOptions,
  ): Ssl {
    if (!this._instance) this._instance = new Ssl(args, opts);

    return this._instance;
  }

  private constructor(...[args, opts]: Parameters<typeof Ssl.getInstance>) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Ssl`, "Ssl", args, opts);

    const usEast1Provider = new aws.Provider(
      "UsEast1Provider",
      { region: "us-east-1" },
      { parent: this },
    );

    this._certificate = new aws.acm.Certificate(
      "Certificate",
      {
        domainName: pulumi.interpolate`${args.tenantId}.backend.${AppData.domainName.fullyQualified}`,
        validationMethod: "DNS",
      },
      { provider: usEast1Provider, parent: this },
    );

    this._certificate.domainValidationOptions.apply((options) =>
      options.forEach((option, index) =>
        this._records.push(
          new cloudflare.Record(
            `CertificateValidationRecord${index}`,
            {
              zoneId: cloudflare.getZoneOutput(
                { name: AppData.domainName.value },
                { parent: this },
              ).id,
              type: option.resourceRecordType,
              name: option.resourceRecordName,
              value: option.resourceRecordValue,
            },
            { parent: this },
          ),
        ),
      ),
    );

    this.registerOutputs({
      certificate: this._certificate.id,
      records: R.map(this._records, R.prop("id")),
    });
  }

  get domainName() {
    return this._certificate.domainName;
  }

  get certificateArn() {
    return this._certificate.arn;
  }
}
