import { createContext } from "react";

import type { Mutators } from "@printworks/core/data/client";
import type { Replicache } from "replicache";

export type ReplicacheContext =
  | { status: "uninitialized" }
  | { status: "initializing" }
  | { status: "ready"; client: Replicache<Mutators> };

export const ReplicacheContext = createContext<ReplicacheContext | null>(null);
