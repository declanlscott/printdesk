import { createContext } from "react";

import type { ViteResource } from "~/types";

export type ResourceContext = ViteResource;

export const ResourceContext = createContext<ResourceContext | null>(null);
