import { createContext } from "react";

import type { Mutators } from "@printdesk/core/data/client";
import type { Replicache } from "@rocicorp/replicache";

export type ReplicacheContext =
  | { status: "uninitialized" }
  | { status: "initializing" }
  | { status: "ready"; client: Replicache<Mutators> };

export const ReplicacheContext = createContext<ReplicacheContext | null>(null);
