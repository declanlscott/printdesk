import * as aws from "@pulumi/aws";
import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

const allViewerExceptHostHeaderPolicyName = "Managed-AllViewerExceptHostHeader";
const cachingOptimizedPolicyName = "Managed-CachingOptimized";

export interface RouterArgs {
  domainName: aws.acm.Certificate["domainName"];
  certificateArn: aws.acm.Certificate["arn"];
  keyPairId: pulumi.Input<string>;
  origins: Record<
    "api" | "assets" | "documents",
    {
      domainName: pulumi.Input<string>;
      originPath?: pulumi.Input<string>;
    }
  >;
}

export class Router extends pulumi.ComponentResource {
  private static _instance: Router;

  private _keyGroup: aws.cloudfront.KeyGroup;
  private _apiCachePolicy: aws.cloudfront.CachePolicy;
  private _s3AccessControl: aws.cloudfront.OriginAccessControl;
  private _distribution: aws.cloudfront.Distribution;
  private _cname: cloudflare.Record;

  static getInstance(
    args: RouterArgs,
    opts: pulumi.ComponentResourceOptions,
  ): Router {
    if (!this._instance) this._instance = new Router(args, opts);

    return this._instance;
  }

  private constructor(...[args, opts]: Parameters<typeof Router.getInstance>) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Router`, "Router", args, opts);

    this._keyGroup = new aws.cloudfront.KeyGroup(
      "KeyGroup",
      { items: [args.keyPairId] },
      { parent: this },
    );

    this._apiCachePolicy = new aws.cloudfront.CachePolicy(
      "ApiCachePolicy",
      {
        defaultTtl: 0,
        minTtl: 0,
        maxTtl: 31536000, // 1 year
        parametersInCacheKeyAndForwardedToOrigin: {
          cookiesConfig: {
            cookieBehavior: "none",
          },
          headersConfig: {
            headerBehavior: "none",
          },
          queryStringsConfig: {
            queryStringBehavior: "all",
          },
          enableAcceptEncodingBrotli: true,
          enableAcceptEncodingGzip: true,
        },
      },
      { parent: this },
    );

    const customOriginConfig = {
      httpPort: 80,
      httpsPort: 443,
      originProtocolPolicy: "https-only",
      originReadTimeout: 30,
      originSslProtocols: ["TLSv1.2"],
    } satisfies CustomOriginConfig;

    this._s3AccessControl = new aws.cloudfront.OriginAccessControl(
      "S3AccessControl",
      {
        originAccessControlOriginType: "s3",
        signingBehavior: "always",
        signingProtocol: "sigv4",
      },
      { parent: this },
    );

    const urlCacheBehaviorConfig = {
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: [
        "GET",
        "HEAD",
        "OPTIONS",
        "PUT",
        "POST",
        "PATCH",
        "DELETE",
      ],
      cachedMethods: ["GET", "HEAD"],
      defaultTtl: 0,
      compress: true,
      cachePolicyId: this._apiCachePolicy.id,
      originRequestPolicyId: aws.cloudfront
        .getOriginRequestPolicy(
          { name: allViewerExceptHostHeaderPolicyName },
          { parent: this },
        )
        .then((policy) => {
          if (!policy.id)
            throw new Error(
              `"${allViewerExceptHostHeaderPolicyName}" origin request policy not found`,
            );

          return policy.id;
        }),
      trustedKeyGroups: [this._keyGroup.id],
    } satisfies BehaviorConfig;

    const bucketCacheBehaviorConfig = {
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: ["GET", "HEAD", "OPTIONS"],
      cachedMethods: ["GET", "HEAD"],
      compress: true,
      cachePolicyId: aws.cloudfront
        .getOriginRequestPolicy(
          { name: cachingOptimizedPolicyName },
          { parent: this },
        )
        .then((policy) => {
          if (!policy.id)
            throw new Error(
              `${cachingOptimizedPolicyName} cache policy not found`,
            );

          return policy.id;
        }),
      trustedKeyGroups: [this._keyGroup.id],
    } satisfies BehaviorConfig;

    this._distribution = new aws.cloudfront.Distribution(
      "Distribution",
      {
        enabled: true,
        origins: [
          {
            originId: "/api/*",
            customOriginConfig,
            ...args.origins.api,
          },
          {
            originId: "/assets/*",
            originAccessControlId: this._s3AccessControl.id,
            ...args.origins.assets,
          },
          {
            originId: "/documents/*",
            originAccessControlId: this._s3AccessControl.id,
            ...args.origins.documents,
          },
          {
            originId: "/*",
            domainName: `does-not-exist.${AppData.domainName.value}`,
            customOriginConfig,
          },
        ],
        defaultCacheBehavior: {
          targetOriginId: "/*",
          ...urlCacheBehaviorConfig,
        },
        orderedCacheBehaviors: [
          {
            targetOriginId: "/api/*",
            pathPattern: "/api/.well-known/*",
            ...urlCacheBehaviorConfig,
            allowedMethods: ["GET", "HEAD", "OPTIONS"],
            defaultTtl: 31536000, // 1 year
            trustedKeyGroups: undefined,
          },
          {
            targetOriginId: "/api/*",
            pathPattern: "/api/parameters/*",
            ...urlCacheBehaviorConfig,
            allowedMethods: ["GET", "HEAD", "OPTIONS"],
            defaultTtl: 31536000, // 1 year
          },
          {
            targetOriginId: "/api/*",
            pathPattern: "/api/*",
            ...urlCacheBehaviorConfig,
          },
          {
            targetOriginId: "/assets/*",
            pathPattern: "/assets/*",
            ...bucketCacheBehaviorConfig,
          },
          {
            targetOriginId: "/documents/*",
            pathPattern: "/documents/*",
            ...bucketCacheBehaviorConfig,
          },
        ],
        restrictions: {
          geoRestriction: {
            restrictionType: "none",
          },
        },
        viewerCertificate: {
          cloudfrontDefaultCertificate: true,
        },
        waitForDeployment: false,
      },
      { parent: this },
    );

    this._cname = new cloudflare.Record(
      "Cname",
      {
        zoneId: cloudflare.getZoneOutput(
          { name: AppData.domainName.value },
          { parent: this },
        ).id,
        name: args.domainName,
        type: "CNAME",
        value: this._distribution.domainName,
      },
      { parent: this },
    );

    this.registerOutputs({
      keyGroup: this._keyGroup.id,
      apiCachePolicy: this._apiCachePolicy.id,
      s3AccessControl: this._s3AccessControl.id,
      distribution: this._distribution.id,
      cname: this._cname.id,
    });
  }

  get distributionId() {
    return this._distribution.id;
  }
}

type CustomOriginConfig =
  aws.types.input.cloudfront.DistributionOriginCustomOriginConfig;

type BehaviorConfig = Omit<
  | aws.types.input.cloudfront.DistributionDefaultCacheBehavior
  | aws.types.input.cloudfront.DistributionOrderedCacheBehavior,
  "targetOriginId" | "pathPattern"
>;
