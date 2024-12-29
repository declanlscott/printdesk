import { client } from "@printworks/functions/api/client";

import { useResource } from "~/lib/hooks/resource";

export const useApi = () => client(useResource().ApiReverseProxy.url);
