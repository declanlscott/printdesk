import { createContext } from "react";

import type { Client } from "@printworks/functions/api/client";

export type ApiContext = { baseUrl: string; client: Client };

export const ApiContext = createContext<ApiContext | null>(null);
