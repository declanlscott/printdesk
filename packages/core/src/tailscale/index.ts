import { Resource } from "sst";

import { Ssm } from "../aws";
import { useTenant } from "../tenants/context";

export namespace Tailscale {
  export const setOauthClient = async (id: string, secret: string) =>
    Ssm.putParameter({
      Name: Ssm.buildName(
        Resource.Aws.tenant.parameters.tailscaleOauthClient.nameTemplate,
        useTenant().id,
      ),
      Value: JSON.stringify({ id, secret }),
      Type: "SecureString",
      Overwrite: true,
    });
}
