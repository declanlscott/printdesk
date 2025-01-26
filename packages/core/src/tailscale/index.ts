import { Resource } from "sst";

import { useTenant } from "../tenants/context";
import { Ssm } from "../utils/aws";

export namespace Tailscale {
  export const setOauthClient = async (id: string, secret: string) =>
    Ssm.putParameter({
      Name: Ssm.buildName(
        Resource.Aws.tenant.parameters.tailscaleOauthClient.nameTemplate,
        useTenant().id,
      ),
      Value: JSON.stringify({ id, secret }),
      Type: "SecureString",
    });
}
