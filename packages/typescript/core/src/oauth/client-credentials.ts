import * as Redacted from "effect/Redacted";

import { EntityId } from "../utils";
import { Constants } from "../utils/constants";

import type { Provider } from "@openauthjs/openauth/provider/provider";
import type { ClientsContract } from "../clients/contract";
import type { OauthContract } from "./contract";

export type ClientCredentialsProviderVerifyResult = Pick<
  typeof ClientsContract.Table.Model.Type,
  "role" | "scopes" | "tenantId"
>;

export type ClientCredentialsProviderProperties = ClientCredentialsProviderVerifyResult &
  Pick<typeof ClientsContract.Table.Model.Type, "id">;

export interface ClientCredentialsProviderConfig {
  verify: (
    credentials: OauthContract.ClientCredentials,
    requestedScopes?: Array<string>,
  ) => Promise<ClientCredentialsProviderVerifyResult>;
}

export const ClientCredentialsProvider = (
  config: ClientCredentialsProviderConfig,
): Provider<ClientCredentialsProviderProperties> => ({
  type: Constants.CLIENT_CREDENTIALS,
  init: () => undefined,
  async client(input) {
    const id = EntityId.make(input.clientID);

    const result = await config.verify(
      { id, secret: Redacted.make(input.clientSecret) },
      input.params.scope?.split(" ").filter(Boolean),
    );

    return { ...result, id };
  },
});
