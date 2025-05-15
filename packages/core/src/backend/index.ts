import { Resource } from "sst";

import { useTenant } from "../tenants/context";
import { Utils } from "../utils";
import { getBackendFqdn } from "./shared";

export namespace Backend {
  export const getFqdn = () =>
    getBackendFqdn(useTenant().id, Resource.Domains.web);

  export const getReverseDns = () => Utils.reverseDns(getFqdn());
}
