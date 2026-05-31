import * as Layer from "effect/Layer";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";

export const atomRegistry = AtomRegistry.make();

export const atomRegistryLayer = Layer.succeed(AtomRegistry.AtomRegistry, atomRegistry);
