import { ActorsContract } from "@printdesk/core/actors/contract";
import * as Atom from "effect/unstable/reactivity/Atom";

export const actorAtom = Atom.make(ActorsContract.PublicActor.singleton.wrap);
