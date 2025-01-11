import { Constants } from "@printworks/core/utils/constants";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

export type Buckets = Record<"assets" | "documents", Bucket>;
export type Queues = Record<"invoicesProcessor", Queue>;

export class Storage extends pulumi.ComponentResource {
  private static _instance: Storage;

  private _buckets: Buckets = {} as Buckets;
  private _queues: Queues = {} as Queues;
  private _bucketsAccessRole: aws.iam.Role;
  private _putParametersRole: aws.iam.Role;

  static getInstance(opts: pulumi.ComponentResourceOptions): Storage {
    if (!this._instance) this._instance = new Storage(opts);

    return this._instance;
  }

  private constructor(...[opts]: Parameters<typeof Storage.getInstance>) {
    const { ApiFunction, AppData, Aws } = useResource();

    super(`${AppData.name}:tenant:aws:Storage`, "Storage", {}, opts);

    this._buckets.assets = new Bucket("Assets", { parent: this });

    this._buckets.documents = new Bucket("Documents", { parent: this });

    this._queues.invoicesProcessor = new Queue(
      "InvoicesProcessor",
      {
        withDlq: true,
        fifo: { enabled: true, deduplication: true },
      },
      { parent: this },
    );

    const assumeRolePolicy = aws.iam.getPolicyDocumentOutput(
      {
        statements: [
          {
            principals: [
              {
                type: "AWS",
                identifiers: [ApiFunction.roleArn],
              },
            ],
            actions: ["sts:AssumeRole"],
          },
        ],
      },
      { parent: this },
    ).json;

    this._bucketsAccessRole = new aws.iam.Role(
      "BucketsAccessRole",
      {
        name: Aws.tenant.roles.bucketsAccess.name,
        assumeRolePolicy: assumeRolePolicy,
      },
      { parent: this },
    );
    new aws.iam.RolePolicy(
      "BucketsAccessRoleInlinePolicy",
      {
        role: this._bucketsAccessRole.name,
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                actions: ["s3:GetObject", "s3:PutObject"],
                resources: [
                  pulumi.interpolate`${this._buckets.assets.arn}/*`,
                  pulumi.interpolate`${this._buckets.documents.arn}/*`,
                ],
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this },
    );

    this._putParametersRole = new aws.iam.Role(
      "PutParametersRole",
      {
        name: Aws.tenant.roles.putParameters.name,
        assumeRolePolicy: assumeRolePolicy,
      },
      { parent: this },
    );
    new aws.iam.RolePolicy(
      "PutParametersRoleInlinePolicy",
      {
        role: this._putParametersRole.name,
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                actions: ["ssm:PutParameter"],
                resources: [
                  Constants.DOCUMENTS_MIME_TYPES_PARAMETER_NAME,
                  Constants.DOCUMENTS_SIZE_LIMIT_PARAMETER_NAME,
                  Constants.TAILNET_PAPERCUT_SERVER_URI_PARAMETER_NAME,
                  Constants.PAPERCUT_SERVER_AUTH_TOKEN_PARAMETER_NAME,
                  Constants.TAILSCALE_OAUTH_CLIENT_PARAMETER_NAME,
                ].map(
                  (name) =>
                    pulumi.interpolate`arn:aws:ssm::${aws.getCallerIdentityOutput({}, { parent: this })}:parameter${name}`,
                ),
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this },
    );

    this.registerOutputs({
      bucketsAccessRole: this._bucketsAccessRole.id,
      putParametersRole: this._putParametersRole.id,
    });
  }

  get buckets() {
    return this._buckets;
  }

  get queues() {
    return this._queues;
  }
}

class Bucket extends pulumi.ComponentResource {
  private _bucket: aws.s3.BucketV2;
  private _publicAccessBlock: aws.s3.BucketPublicAccessBlock;
  private _policy: aws.s3.BucketPolicy;

  constructor(name: string, opts: pulumi.ComponentResourceOptions) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Bucket`, name, {}, opts);

    this._bucket = new aws.s3.BucketV2(
      `${name}Bucket`,
      { forceDestroy: true },
      { retainOnDelete: AppData.stage === "production", parent: this },
    );

    this._publicAccessBlock = new aws.s3.BucketPublicAccessBlock(
      `${name}PublicAccessBlock`,
      {
        bucket: this._bucket.bucket,
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
      { parent: this },
    );

    this._policy = new aws.s3.BucketPolicy(
      `${name}Policy`,
      {
        bucket: this._bucket.bucket,
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                principals: [
                  {
                    type: "Service",
                    identifiers: ["cloudfront.amazonaws.com"],
                  },
                ],
                actions: ["s3:GetObject"],
                resources: [pulumi.interpolate`${this._bucket.arn}/*`],
              },
              {
                effect: "Deny",
                principals: [{ type: "*", identifiers: ["*"] }],
                actions: ["s3:*"],
                resources: [
                  this._bucket.arn,
                  pulumi.interpolate`${this._bucket.arn}/*`,
                ],
                conditions: [
                  {
                    test: "Bool",
                    variable: "aws:SecureTransport",
                    values: ["false"],
                  },
                ],
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this, dependsOn: this._publicAccessBlock },
    );

    new aws.s3.BucketCorsConfigurationV2(
      `${name}Cors`,
      {
        bucket: this._bucket.bucket,
        corsRules: [
          {
            allowedHeaders: ["*"],
            allowedOrigins: ["*"],
            allowedMethods: ["DELETE", "GET", "HEAD", "POST", "PUT"],
            maxAgeSeconds: 0,
          },
        ],
      },
      { parent: this },
    );

    this.registerOutputs({
      bucket: this._bucket.id,
      publicAccessBlock: this._publicAccessBlock.id,
      policy: this._policy.id,
    });
  }

  get regionalDomainName() {
    return this._bucket.bucketRegionalDomainName;
  }

  get name() {
    return this._bucket.bucket;
  }

  get arn() {
    return this._bucket.arn;
  }
}

interface QueueArgs {
  withDlq?: boolean;
  fifo: { enabled: false } | { enabled: true; deduplication: boolean };
}

class Queue extends pulumi.ComponentResource {
  private _dlq?: aws.sqs.Queue;
  private _queue: aws.sqs.Queue;

  constructor(
    name: string,
    args: QueueArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Queue`, name, args, opts);

    if (args.withDlq)
      this._dlq = new aws.sqs.Queue(
        `${name}Dlq`,
        {},
        { retainOnDelete: AppData.stage === "production", parent: this },
      );

    this._queue = new aws.sqs.Queue(
      `${name}Queue`,
      {
        fifoQueue: args.fifo.enabled,
        contentBasedDeduplication: args.fifo.enabled
          ? args.fifo.deduplication
          : undefined,
        visibilityTimeoutSeconds: 30,
        redrivePolicy:
          args.withDlq && this._dlq
            ? pulumi.jsonStringify({
                deadLetterTargetArn: this._dlq.arn,
                maxReceiveCount: 3,
              })
            : undefined,
      },
      { retainOnDelete: AppData.stage === "production", parent: this },
    );

    this.registerOutputs({
      dlq: this._dlq?.id,
      queue: this._queue.id,
    });
  }

  get arn() {
    return this._queue.arn;
  }

  get name() {
    return this._queue.name;
  }

  get url() {
    return this._queue.url;
  }
}
