import * as HttpApi from "@effect/platform/HttpApi";
import * as Effect from "effect/Effect";

import { Procedures } from "../procedures";
import { RealtimeApi } from "../realtime/api";
import { ReplicacheApi } from "../replicache/api";

export namespace ApiContract {
  export class Application extends Effect.Service<Application>()(
    "@printdesk/core/api/Application",
    {
      dependencies: [Procedures.Mutations.Default],
      effect: ReplicacheApi.group.pipe(
        Effect.map((replicacheApiGroup) =>
          HttpApi.make("application")
            .add(RealtimeApi.Group)
            .add(replicacheApiGroup),
        ),
      ),
    },
  ) {}
}
