import type { APIGatewayProxyEventV2 } from "aws-lambda";
import type { LambdaContext } from "hono/aws-lambda";

export interface Bindings {
  event: APIGatewayProxyEventV2;
  lambdaContext: LambdaContext;
}
