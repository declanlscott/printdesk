import { Resource } from "sst";

import { useTenant } from "../tenants/context";
import { Utils } from "../utils";
import { getBackendFqdn } from "./shared";

export namespace Backend {
  export const getFqdn = () =>
    getBackendFqdn(useTenant().id, Resource.AppData.domainName.fullyQualified);

  export const getReverseDns = () => Utils.reverseDns(getFqdn());
}
