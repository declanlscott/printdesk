import * as R from "remeda";

import * as custom from "./custom";
import { isProdStage } from "./misc";

const devVpcId = process.env.AWS_DEV_VPC_ID;

export const vpc =
  isProdStage || !devVpcId
    ? new custom.aws.Vpc("Vpc", {
        az: isProdStage ? 2 : 1,
        nat: "ec2",
      })
    : custom.aws.Vpc.get("Vpc", devVpcId);

export const vpcLink = new aws.apigatewayv2.VpcLink("VpcLink", {
  securityGroupIds: vpc.securityGroups,
  subnetIds: vpc.publicSubnets,
});

export const dynamoVpcEndpoint = new aws.ec2.VpcEndpoint("DynamoVpcEndpoint", {
  vpcId: vpc.id,
  vpcEndpointType: "Gateway",
  serviceName: $interpolate`com.amazonaws.${aws.getRegionOutput().name}.dynamodb`,
  routeTableIds: vpc.nodes.privateRouteTables.apply(R.map(R.prop("id"))),
});

export const cluster = new sst.aws.Cluster("Cluster", {
  vpc,
});
