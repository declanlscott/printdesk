import type {
  AnyRouter,
  inferRouterInputs,
  inferRouterOutputs,
  // I'll import what I want!!
} from "@trpc/server/unstable-core-do-not-import";

export type IO = "input" | "output";

export type InferRouterIO<
  TIO extends IO,
  TRouter extends AnyRouter,
> = TIO extends "input"
  ? inferRouterInputs<TRouter>
  : TIO extends "output"
    ? inferRouterOutputs<TRouter>
    : never;
