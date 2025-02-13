import { Resource } from "sst";

import { Api } from "../backend/api";
import { useTenant } from "../tenants/context";
import { Ssm } from "../utils/aws";

export namespace Papercut {
  export const setTailnetServerUri = async (uri: string) =>
    Ssm.putParameter({
      Name: Ssm.buildName(
        Resource.Aws.tenant.parameters.tailnetPapercutServerUri.nameTemplate,
        useTenant().id,
      ),
      Value: uri,
      Type: "String",
      Overwrite: true,
    });

  export async function setServerAuthToken(token: string) {
    const name = Ssm.buildName(
      Resource.Aws.tenant.parameters.papercutServerAuthToken.nameTemplate,
      useTenant().id,
    );

    await Ssm.putParameter({
      Name: name,
      Value: token,
      Type: "SecureString",
      Overwrite: true,
    });

    await Api.invalidateCache([`/parameters${name}`]);
  }

  export const getServerAuthToken = async () =>
    Api.getParameter(
      Ssm.buildName(
        Resource.Aws.tenant.parameters.papercutServerAuthToken.nameTemplate,
        useTenant().id,
      ),
    );
}
