import { Api } from "../api";
import { Ssm } from "../utils/aws";
import { Constants } from "../utils/constants";
import { HttpError } from "../utils/errors";

export namespace Papercut {
  export const setTailnetServerUri = async (uri: string) =>
    Ssm.putParameter({
      Name: Constants.TAILNET_PAPERCUT_SERVER_URI_PARAMETER_NAME,
      Value: uri,
      Type: "String",
    });

  export const setServerAuthToken = async (token: string) =>
    Ssm.putParameter({
      Name: Constants.PAPERCUT_SERVER_AUTH_TOKEN_PARAMETER_NAME,
      Value: token,
      Type: "SecureString",
    });

  export async function getServerAuthToken() {
    const res = await Api.send(
      `/parameters${Constants.PAPERCUT_SERVER_AUTH_TOKEN_PARAMETER_NAME}?withDecryption=true`,
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
