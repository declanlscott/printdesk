import { hostnames } from "./dns";
import * as lib from "./lib";

export const assetsBucket = new sst.aws.Bucket("AssetsBucket", {
  transform: {
    policy: (args) => {
      args.policy = sst.aws.iamEdit(args.policy, (policy) => {
        policy.Statement.push({
          Effect: "Allow",
          Principal: { AWS: "*" },
          Action: ["s3:*"],
          Resource: [
            $interpolate`arn:aws:s3:::${args.bucket}`,
            $interpolate`arn:aws:s3:::${args.bucket}/*`,
          ],
          Condition: {
            StringEquals: {
              "s3:DataAccessPointAccount": aws.getCallerIdentityOutput().accountId,
            },
          },
        });
      });
    },
  },
});

export const assetsBucketAccessPointTemplate = new lib.templates.aws.s3.AccessPoint(
  "AssetsBucketAccessPointTemplate",
  { identifier: "assets-ap" },
);

export const assetsPrivateKey = new tls.PrivateKey("AssetsPrivateKey", {
  algorithm: "RSA",
  rsaBits: 2048,
});

export const assetsPublicKey = new aws.cloudfront.PublicKey("AssetsPublicKey", {
  encodedKey: assetsPrivateKey.publicKeyPem,
});

export const assetsKeyGroup = new aws.cloudfront.KeyGroup("AssetsKeyGroup", {
  items: [assetsPublicKey.id],
});

export const assetsRouter = new sst.aws.Router("AssetsRouter", {
  domain: {
    name: hostnames.properties.assets,
    dns: sst.cloudflare.dns({ proxy: true }),
  },
  transform: {
    cdn: {
      transform: {
        distribution: (args) => {
          args.priceClass = "PriceClass_100";
          args.defaultCacheBehavior = {
            ...args.defaultCacheBehavior,
            trustedKeyGroups: [assetsKeyGroup.id],
          };
        },
      },
    },
  },
});
