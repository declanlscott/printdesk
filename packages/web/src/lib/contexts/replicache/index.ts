import { createContext } from "react";

import type { Replicache } from "replicache";
import type { Mutators } from "~/lib/hooks/replicache";

export type ReplicacheContext =
  | { status: "uninitialized" }
  | { status: "initializing" }
  | { status: "ready"; client: Replicache<Mutators> };

export const ReplicacheContext = createContext<ReplicacheContext | null>(null);
