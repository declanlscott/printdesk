import { Resource } from "sst";

import { Api } from "../tenants/api";
import { useTenant } from "../tenants/context";
import { Ssm } from "../utils/aws";
import { HttpError } from "../utils/errors";

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

  export const setServerAuthToken = async (token: string) =>
    Ssm.putParameter({
      Name: Ssm.buildName(
        Resource.Aws.tenant.parameters.papercutServerAuthToken.nameTemplate,
        useTenant().id,
      ),
      Value: token,
      Type: "SecureString",
      Overwrite: true,
    });

  export async function getServerAuthToken() {
    const res = await Api.send(
      `/parameters${Ssm.buildName(Resource.Aws.tenant.parameters.papercutServerAuthToken.nameTemplate, useTenant().id)}?withDecryption=true`,
    );
    if (!res.ok)
      throw new HttpError.BadGateway({
        upstream: {
          error: new HttpError.Error(res.statusText, res.status),
          text: await res.text(),
        },
      });

    return res.text();
  }
}
