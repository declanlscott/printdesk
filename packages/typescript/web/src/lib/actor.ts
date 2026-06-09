import * as Effect from "effect/Effect";
import * as Struct from "effect/Struct";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpApiClient from "effect/unstable/httpapi/HttpApiClient";
import * as Atom from "effect/unstable/reactivity/Atom";

import { Bff } from "../bff/contract";

export const userActorAtomRuntime = FetchHttpClient.layer.pipe(Atom.runtime);

export const userActorAtom = userActorAtomRuntime.atom(
  HttpClient.HttpClient.pipe(
    Effect.flatMap((httpClient) => HttpApiClient.group(Bff, { httpClient, group: "auth" })),
    Effect.flatMap((auth) => auth.me()),
  ),
);

export const actorAtom = Atom.make((get) =>
  get.resultOnce(userActorAtom).pipe(Effect.map(Struct.get("wrap"))),
);
