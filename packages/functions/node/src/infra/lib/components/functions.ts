import { Constants } from "@printworks/core/utils/constants";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

export class Functions extends pulumi.ComponentResource {
  private static _instance: Functions;

  private _papercutSecureReverseProxy: PapercutSecureReverseProxy;

  static getInstance(opts: pulumi.ComponentResourceOptions) {
    if (!this._instance) this._instance = new Functions(opts);

    return this._instance;
  }

  private constructor(...[opts]: Parameters<typeof Functions.getInstance>) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Functions`, "Functions", {}, opts);

    this._papercutSecureReverseProxy = PapercutSecureReverseProxy.getInstance({
      parent: this,
    });
  }

  get papercutSecureReverseProxy() {
    return this._papercutSecureReverseProxy;
  }
}

class PapercutSecureReverseProxy extends pulumi.ComponentResource {
  private static _instance: PapercutSecureReverseProxy;

  private _role: aws.iam.Role;
  private _function: aws.lambda.Function;

  static getInstance(opts: pulumi.ComponentResourceOptions) {
    if (!this._instance) this._instance = new PapercutSecureReverseProxy(opts);

    return this._instance;
  }

  private constructor(
    ...[opts]: Parameters<typeof PapercutSecureReverseProxy.getInstance>
  ) {
    const { AppData, Code } = useResource();

    super(
      `${AppData.name}:tenant:aws:PapercutSecureReverseProxy`,
      "PapercutSecureReverseProxy",
      {},
      opts,
    );

    this._role = new aws.iam.Role(
      "Role",
      {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
          Service: "lambda.amazonaws.com",
        }),
        managedPolicyArns: [aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole],
      },
      { parent: this },
    );
    new aws.iam.RolePolicy(
      "RoleInlinePolicy",
      {
        role: this._role.name,
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                actions: ["ssm:GetParameter"],
                resources: [
                  Constants.TAILNET_PAPERCUT_SERVER_URI_PARAMETER_NAME,
                  Constants.TAILSCALE_OAUTH_CLIENT_PARAMETER_NAME,
                ].map(
                  (name) =>
                    pulumi.interpolate`arn:aws:ssm:${aws.getRegionOutput({}, { parent: this }).name}:${
                      aws.getCallerIdentityOutput({}, { parent: this })
                        .accountId
                    }:parameter${name}`,
                ),
              },
              {
                actions: ["kms:Decrypt"],
                resources: [
                  aws.kms.getKeyOutput(
                    { keyId: "alias/aws/ssm" },
                    { parent: this },
                  ).arn,
                ],
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this },
    );

    this._function = new aws.lambda.Function(
      "Function",
      {
        s3Bucket: Code.bucket.name,
        s3Key: Code.bucket.object.papercutSecureReverseProxy.key,
        s3ObjectVersion:
          Code.bucket.object.papercutSecureReverseProxy.versionId,
        runtime: aws.lambda.Runtime.CustomAL2023,
        architectures: ["arm64"],
        timeout: 20,
        role: this._role.arn,
      },
      { parent: this },
    );

    this.registerOutputs({
      role: this._role.id,
      function: this._function.id,
    });
  }

  get functionArn() {
    return this._function.arn;
  }

  get invokeArn() {
    return this._function.invokeArn;
  }
}
