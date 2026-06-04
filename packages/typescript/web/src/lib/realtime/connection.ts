import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import * as Struct from "effect/Struct";
import * as Atom from "effect/unstable/reactivity/Atom";

import { realtimeAtom } from ".";

export const realtimeConnectionAtom = Atom.make((get) =>
  realtimeAtom.pipe(get.result, Effect.map(Struct.get("connectionStream")), Stream.unwrap),
);
