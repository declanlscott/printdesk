import * as lib from "./lib/components";
import { isProdStage } from "./misc";

const devVpcId = process.env.AWS_DEV_VPC_ID;

export const vpc =
  isProdStage || !devVpcId
    ? new lib.aws.ec2.Vpc("Vpc")
    : lib.aws.ec2.Vpc.get("Vpc", devVpcId);

export const vpcLink = new aws.apigatewayv2.VpcLink("VpcLink", {
  securityGroupIds: vpc.securityGroups,
  subnetIds: vpc.publicSubnets,
});

export const cluster = new sst.aws.Cluster("Cluster", {
  vpc,
});
